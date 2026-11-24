#!/usr/bin/env python3
"""Maintain a pool of disposable GitHub runners without exposing host credentials."""
import argparse
import fcntl
import json
from pathlib import Path
import signal
import subprocess
import time
import uuid

STOP = False


def request_stop(_signum, _frame):
    global STOP
    STOP = True


def execute(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True,
                          timeout=60, **kwargs).stdout


def api(repo, endpoint, payload=None):
    command = ['gh', 'api', f'repos/{repo}/actions/runners{endpoint}']
    if payload is not None:
        command += ['--method', 'POST', '--input', '-']
    return json.loads(execute(command, input=json.dumps(payload) if payload else None))


def remove_idle_runner(repo, runner_id, expected_name, label):
    """Only retire the ID recorded by this supervisor; never delete a busy runner."""
    try:
        runner = api(repo, f'/{runner_id}')
    except subprocess.CalledProcessError as error:
        if 'HTTP 404' in error.stderr:
            return True  # JIT runners normally unregister themselves.
        raise
    if runner['name'] != expected_name or not expected_name.startswith(label + '-'):
        raise RuntimeError('Runner ownership does not match recorded state')
    if runner['busy']:
        return False
    execute(['gh', 'api', '--method', 'DELETE',
             f'repos/{repo}/actions/runners/{runner_id}'])
    return True


def inspect_container(docker, name):
    inspect = subprocess.run(docker + ['inspect', name],
                             text=True, capture_output=True, timeout=30)
    if inspect.returncode == 0:
        return json.loads(inspect.stdout)[0]
    message = inspect.stderr.lower()
    if 'no such object' in message or 'no such container' in message:
        return None
    raise RuntimeError('Cannot inspect container; Docker may be unavailable')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--context', required=True)
    parser.add_argument('--image', required=True)
    parser.add_argument('--label', required=True)
    parser.add_argument('--slots', type=int, choices=range(1, 9), default=4)
    parser.add_argument('--state-dir', type=Path, required=True)
    args = parser.parse_args()
    args.state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = (args.state_dir / 'supervisor.lock').open('w')
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    docker = ['docker', '--context', args.context]
    execute(docker + ['image', 'inspect', args.image])
    admin = execute(['gh', 'api', f'repos/{args.repo}', '--jq', '.permissions.admin'])
    if admin.strip() != 'true':
        parser.error('GitHub repository admin access is required for JIT runner registration')
    fork_workflows = execute([
        'gh', 'api', f'repos/{args.repo}/actions/permissions/fork-pr-workflows-private-repos',
        '--jq', '.run_workflows_from_fork_pull_requests',
    ])
    if fork_workflows.strip() != 'false':
        parser.error('Fork PR workflows must be disabled for a repository-registered runner pool')
    processes = {}
    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)

    while not STOP or processes:
        for slot in range(1, args.slots + 1):
            state_file = args.state_dir / f'slot-{slot}.json'
            if slot in processes:
                process, log = processes[slot]
                if process.poll() is None:
                    if STOP:
                        state = json.loads(state_file.read_text())
                        try:
                            if remove_idle_runner(args.repo, state['runner_id'], state['container'], args.label):
                                execute(docker + ['stop', '--time', '30', state['container']])
                        except (subprocess.SubprocessError, OSError, RuntimeError, ValueError):
                            # Busy jobs are allowed to complete before the supervisor exits.
                            pass
                    continue
                log.close()
                del processes[slot]
            try:
                # Recover only our own container/runner after a supervisor restart.
                if state_file.exists():
                    state = json.loads(state_file.read_text())
                    if state['repo'] != args.repo or state['label'] != args.label:
                        raise RuntimeError('Recorded repository or label does not match')
                    container = inspect_container(docker, state['container'])
                    if container is not None:
                        if container['Config']['Labels'].get('ci.owner') != args.label:
                            raise RuntimeError('Container owner label does not match')
                        if container['State']['Running']:
                            log = (args.state_dir / f'slot-{slot}.log').open('a')
                            process = subprocess.Popen(docker + ['wait', state['container']],
                                                       stdout=log, stderr=log)
                            processes[slot] = (process, log)
                            continue
                        execute(docker + ['rm', state['container']])
                    if not remove_idle_runner(args.repo, state['runner_id'], state['container'], args.label):
                        continue
                    state_file.unlink()
                if STOP:
                    continue

                name = f'{args.label}-{slot}-{uuid.uuid4().hex[:8]}'
                response = api(args.repo, '/generate-jitconfig', {
                    'name': name, 'runner_group_id': 1,
                    'labels': ['self-hosted', 'Linux', 'ARM64', args.label],
                    'work_folder': 'work'
                })
                # No token/config is persisted. Only ownership metadata survives restarts.
                state_file.write_text(json.dumps({
                    'repo': args.repo, 'label': args.label,
                    'runner_id': response['runner']['id'], 'container': name
                }))
                log = (args.state_dir / f'slot-{slot}.log').open('a')
                process = subprocess.Popen(docker + [
                    'run', '--rm', '--interactive', '--name', name,
                    '--label', f'ci.owner={args.label}',
                    '--cpus', '4', '--memory', '6g', '--pids-limit', '2048',
                    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                    args.image
                ], stdin=subprocess.PIPE, stdout=log, stderr=log, text=True)
                processes[slot] = (process, log)
                process.stdin.write(response['encoded_jit_config'] + '\n')
                process.stdin.close()
                print(f'Slot {slot}: started {name}', flush=True)
            except (subprocess.SubprocessError, OSError, RuntimeError, ValueError) as error:
                # SubprocessError string representations omit captured stdout (JIT secrets).
                print(f'Slot {slot}: {type(error).__name__}; retrying in 15s', flush=True)
        time.sleep(15)


if __name__ == '__main__':
    main()
