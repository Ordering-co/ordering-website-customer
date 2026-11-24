#!/usr/bin/env python3
"""Recover a stalled Mac unit lane in the CI run of a trusted pull request."""
from datetime import datetime
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request


REPO = 'Finitless-com/website-marketplace-theming'
CI_PATH = '.github/workflows/ci.yml'
CI_NAME = 'CI Quality Gate'
CI_EVENTS = ('pull_request',)
MAC_LABEL = 'website-theming-ci'
# Nobody serves the drill label: a PR labelled ci:simulate-mac-offline rehearses the fallback.
MAC_LABELS = {MAC_LABEL, 'website-theming-ci-offline-drill'}
UNIT_LANE = 'Unit tests'
TEST_COMMAND = 'Run tests'
# The gate fails this step when a dependency failed; the dependency itself says why.
DEPENDENCY_CHECK = 'Check every job the triage asked for'
TRIAGE = 'Triage'
# The unit lane appears as soon as the triage ends; if it is not there after this, none was asked for.
LANE_GRACE_SECONDS = 10
ACTIVE_STATUSES = ('queued', 'in_progress')
INFRA_CONCLUSIONS = {'failure', 'timed_out', 'action_required', 'stale'}
QUEUE_SECONDS = 20
PROGRESS_SECONDS = 1200
POLL_SECONDS = 20
# While a Mac job could still be left in the queue, look every few seconds.
FAST_POLL_SECONDS = 5
FIND_SECONDS = 2
# Waiting for the new attempt after rerun-failed-jobs, before re-running every job.
ATTEMPT_SECONDS = 8


def timestamp(value, default=0):
    if not value or value.startswith('0001-'):
        return default
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def is_mac_test(job):
    labels = set(job.get('labels') or [])
    return job['name'] == UNIT_LANE and 'self-hosted' in labels and bool(labels & MAC_LABELS)


def validation_failed(jobs):
    for job in jobs:
        conclusion = job.get('conclusion')
        steps = job.get('steps') or []
        failed_steps = {step['name'] for step in steps if step.get('conclusion') == 'failure'}
        if is_mac_test(job):
            if TEST_COMMAND in failed_steps:
                return True
            # A stale job or runner action required can report a cancelled
            # step without a Vitest result. A timeout executing the command
            # is ambiguous, so preserve it along with real test failures.
            if conclusion in ('failure', 'timed_out') and any(
                step['name'] == TEST_COMMAND and timestamp(step.get('started_at')) > 0
                and step.get('conclusion') != 'success'
                for step in steps
            ):
                return True
        elif (job['name'] == CI_NAME and conclusion in (None, 'failure')
              and failed_steps == {DEPENDENCY_CHECK}):
            # This gate reports a failed dependency. Inspect the dependency's
            # own result to distinguish Mac infrastructure from validation.
            continue
        elif conclusion in INFRA_CONCLUSIONS or failed_steps:
            return True
    return False


def decision(jobs, now, started):
    if validation_failed(jobs):
        return 'stop', 'A validation failed; preserve the CI result.'
    if any(job.get('conclusion') == 'cancelled' for job in jobs):
        return 'stop', 'A job was cancelled; preserve the CI result.'
    lanes = [job for job in jobs if job['name'] == UNIT_LANE]
    triage = [job for job in jobs if job['name'] == TRIAGE and job['status'] == 'completed']
    ready = max((timestamp(job.get('completed_at')) for job in triage), default=0)
    for job in lanes:
        if not is_mac_test(job):
            continue
        if job['status'] == 'queued':
            # Queue time counts from the end of the triage, not from the run's start.
            if now - max(timestamp(job.get('created_at'), started), ready) >= QUEUE_SECONDS:
                return 'fallback', f"{job['name']} waited at least {QUEUE_SECONDS} seconds for the Mac."
        elif job['status'] == 'in_progress':
            progress = [timestamp(job.get('started_at'), started)]
            for step in job.get('steps') or []:
                progress.extend(timestamp(step.get(key)) for key in ('started_at', 'completed_at'))
            if now - max(progress) >= PROGRESS_SECONDS:
                return 'fallback', f"{job['name']} stalled for at least 20 minutes."
        elif job.get('conclusion') in INFRA_CONCLUSIONS:
            return 'fallback', f"{job['name']} failed outside the test command."
    if lanes and all(not is_mac_test(job) or job['status'] == 'completed' for job in lanes):
        return 'stop', 'No Mac job still needs monitoring.'
    if triage and not lanes and now - ready >= LANE_GRACE_SECONDS:
        return 'stop', 'The triage asked for no job that can go to the Mac.'
    return 'wait', 'Waiting for the unit lane.'


class GitHub:
    def __init__(self, repo, token):
        self.repo = repo
        self.token = token

    def __call__(self, method, path):
        request = urllib.request.Request(
            f'https://api.github.com/repos/{self.repo}/{path}',
            data=b'{}' if method == 'POST' else None, method=method,
            headers={
                'Authorization': f'Bearer {self.token}',
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
                'X-GitHub-Api-Version': '2026-03-10',
            },
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            data = response.read()
            return json.loads(data) if data else {}


def trusted_human(actor):
    login = (actor or {}).get('login')
    return bool(login and not login.endswith('[bot]') and actor.get('type') != 'Bot')


def has_run_identity(run):
    return (
        type(run.get('id')) is int and run['id'] > 0
        and type(run.get('run_attempt')) is int and run['run_attempt'] > 0
        and run.get('event') in CI_EVENTS
    )


def eligible(run):
    # Same-repo PRs from people, first attempt. Forks and bots never reach the Mac.
    return (
        has_run_identity(run)
        and run.get('name') == CI_NAME
        and run.get('path', '').split('@')[0] == CI_PATH
        and run.get('run_attempt') == 1
        and (run.get('repository') or {}).get('full_name') == REPO
        and (run.get('head_repository') or {}).get('full_name') == REPO
        and trusted_human(run.get('actor'))
        and trusted_human(run.get('triggering_actor'))
    )


def current(api, target):
    run = api('GET', f"actions/runs/{target['id']}")
    keys = ('id', 'event', 'run_attempt')
    if eligible(run) and all(run[key] == target[key] for key in keys):
        return run
    return None


def still_wanted(api, run):
    # A PR run is only worth recovering while its PR is open at the same commit.
    pulls = [api('GET', f"pulls/{ref['number']}") for ref in run.get('pull_requests') or []]
    return bool(pulls) and all(
        pull['state'] == 'open' and pull['head']['sha'] == run['head_sha'] for pull in pulls
    )


def recoverable(run):
    if run['status'] == 'completed':
        return run.get('conclusion') in INFRA_CONCLUSIONS
    return run['status'] in ACTIVE_STATUSES and not run.get('conclusion')


def jobs(api, run):
    path = f"actions/runs/{run['id']}/attempts/{run['run_attempt']}/jobs?per_page=100"
    return api('GET', path)['jobs']


def classify(api, run, now):
    started = timestamp(run.get('run_started_at'), timestamp(run.get('created_at'), now))
    listed = jobs(api, run)
    return (*decision(listed, now, started), listed)


def cancel_request(api, run_id, operation):
    try:
        api('POST', f'actions/runs/{run_id}/{operation}')
    except urllib.error.HTTPError as error:
        error.close()
        if error.code != 409:
            raise
        # Cancellation may have preceded this request. Never claim the attempt.
        return False
    return True


def cancel(api, run, clock, sleep):
    if not cancel_request(api, run['id'], 'cancel'):
        return False
    for operation in ('cancel', 'force-cancel'):
        if operation == 'force-cancel':
            latest = current(api, run)
            if not latest or latest['status'] == 'completed':
                return bool(latest)
            if validation_failed(jobs(api, latest)):
                return False
            latest = current(api, run)
            if not latest or not recoverable(latest) or latest['status'] == 'completed':
                return False
            if not cancel_request(api, run['id'], operation):
                return False
        deadline = clock() + 90
        while clock() < deadline:
            latest = current(api, run)
            if not latest:
                return False
            if latest['status'] == 'completed':
                return True
            sleep(2)
    return False


def retry(api, target, clock, sleep, log):
    run = current(api, target)
    if not run or not recoverable(run):
        return False
    action, reason, _ = classify(api, run, clock())
    latest = current(api, target)
    if (action != 'fallback' or not latest or not recoverable(latest)
            or latest['status'] != run['status'] or not still_wanted(api, latest)):
        return False

    log(f"CI run {run['id']}, attempt {run['run_attempt']}: {reason}")
    if run['status'] != 'completed':
        if not cancel(api, run, clock, sleep):
            return False
        latest = current(api, target)
        if not latest or latest['status'] != 'completed':
            return False
        if latest.get('conclusion') == 'cancelled':
            # This process got an accepted cancellation. Preserve failures
            # reported while GitHub was terminating jobs.
            if validation_failed(jobs(api, latest)):
                return False
        elif not recoverable(latest) or classify(api, latest, clock())[0] != 'fallback':
            return False
        checked = latest
        latest = current(api, target)
        if (not latest or latest['status'] != checked['status']
                or latest.get('conclusion') != checked.get('conclusion')):
            return False

    # GitHub exposes mutations by run ID, so re-check the attempt immediately
    # before each write. Do not retry a POST with an ambiguous response.
    if not still_wanted(api, latest):
        return False
    if not rerun_failed(api, run, clock, sleep, log):
        return False
    log(f"Requested Ubuntu fallback for CI run {run['id']}, attempt {run['run_attempt'] + 1}.")
    return True


def rerun_failed(api, run, clock, sleep, log):
    """Re-run only the cancelled and failed jobs (and their dependents); keep the green ones.

    GitHub documents that the endpoint re-runs failed jobs and their dependents; it does not say
    that cancelled jobs count, so a request that is rejected, or that opens no new attempt,
    falls back to re-running the whole run (the old behavior) instead of leaving the run stuck.
    Returns whether a re-run was requested.
    """
    try:
        api('POST', f"actions/runs/{run['id']}/rerun-failed-jobs")
        deadline = clock() + ATTEMPT_SECONDS
        while True:
            if api('GET', f"actions/runs/{run['id']}")['run_attempt'] > run['run_attempt']:
                return True
            if clock() >= deadline:
                break
            sleep(2)
    except urllib.error.HTTPError as error:
        error.close()
        if not 400 <= error.code < 500:
            raise  # an ambiguous write is never repeated
    # The wait may have outlasted the PR's usefulness: check again before the second write.
    latest = current(api, run)
    if not latest or not still_wanted(api, latest):
        return False
    log(f"rerun-failed-jobs did not open a new attempt for CI run {run['id']}; re-running every job.")
    api('POST', f"actions/runs/{run['id']}/rerun")
    return True


def monitor(api, event, clock=time.time, sleep=time.sleep, log=print):
    repo = event.get('repository') or {}
    target = event.get('workflow_run') or {}
    if (event.get('action') != 'in_progress' or repo.get('full_name') != REPO
            or repo.get('default_branch') != 'main' or not has_run_identity(target)):
        return False
    deadline = clock() + 1620
    while clock() < deadline:
        run = current(api, target)
        if not run or not recoverable(run):
            return False
        action, _, listed = classify(api, run, clock())
        if action == 'fallback':
            return retry(api, target, clock, sleep, log)
        if action == 'stop' or run['status'] == 'completed':
            return False
        # The unit lane may be queued, or may not exist yet because the triage is still running.
        waiting = not any(job['name'] == UNIT_LANE for job in listed) or any(
            is_mac_test(job) and job['status'] == 'queued' for job in listed)
        sleep(FAST_POLL_SECONDS if waiting else POLL_SECONDS)
    log(f"Monitor window ended for CI run {target['id']}.")
    return False


def monitor_pull_request(api, event, clock=time.time, sleep=time.sleep, log=print):
    pull = event.get('pull_request') or {}
    sha = (pull.get('head') or {}).get('sha')
    if (event.get('action') not in ('opened', 'synchronize', 'reopened')
            or (event.get('repository') or {}).get('full_name') != REPO
            or ((pull.get('head') or {}).get('repo') or {}).get('full_name') != REPO or not sha):
        return False
    # The CI run for this push is created beside this one; wait for it to appear.
    deadline = clock() + 120
    while clock() < deadline:
        query = urllib.parse.urlencode({'event': 'pull_request', 'head_sha': sha, 'per_page': 20})
        found = [run for run in api('GET', f'actions/workflows/ci.yml/runs?{query}')['workflow_runs']
                 if run.get('head_sha') == sha and eligible(run)]
        if found:
            target = max(found, key=lambda run: run['id'])
            return monitor(api, {'action': 'in_progress', 'repository': event['repository'],
                                 'workflow_run': target}, clock, sleep, log)
        sleep(FIND_SECONDS)
    return False


if __name__ == '__main__':
    repo = os.environ['GITHUB_REPOSITORY']
    event_name = os.environ['GITHUB_EVENT_NAME']
    api = GitHub(repo, os.environ['GITHUB_TOKEN'])

    def log(message):
        print(message, flush=True)
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write(f'- {message}\n')

    if event_name == 'pull_request':
        monitor_pull_request(api, json.loads(Path(os.environ['GITHUB_EVENT_PATH']).read_text()), log=log)
