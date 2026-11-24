#!/usr/bin/env python3
"""Determine the checks for an individual change, before installing dependencies."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
BROWSER_DIR = ROOT / 'e2e/design'
REGISTRY = ROOT / 'ci/affected-browser.json'
JS_EXTENSIONS = {'.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'}
CI_PREFIXES = ('.github/workflows/ci.yml', '.github/workflows/runner-fallback.yml', '.github/workflows/mac-cache.yml',
               '.github/actions/', 'ci/')
# implementation notesa PR must reach a green gate in about 120 s of wall clock. The serial browser suite
# costs ~33 s per spec (measured); a lane spends ~13 s waiting for the triage, ~30 s on checkout,
# dependencies and browsers, and the gate needs ~8 s: one spec per lane (a slow one runs ~70 s) keeps
# the lane under the budget, so the cap is eight lanes of one spec.
# Every spec outside the cap runs in the full matrix on main (push, nightly, weekly, manual).
BROWSER_PR_LANES = 8
BROWSER_SPECS_PER_LANE = 1
BROWSER_PR_CAP = BROWSER_PR_LANES * BROWSER_SPECS_PER_LANE
# `unit: all` has ~1,560 worker-seconds of Vitest: 12 one-worker shards on GitHub-hosted runners.
UNIT_PR_SHARDS = 12
# Lanes receive the selection as one environment variable (<128 KB); past this, test and lint everything.
MAX_LANE_PATHS = 300
GLOBAL_INPUTS = {
    'package.json', 'pnpm-lock.yaml', 'vite.config.js', 'jsconfig.json',
    'playwright.design.config.js', '.npmrc', '.nvmrc', 'NODE_VERSION.txt',
    'src/setupTests.js', 'src/@/components', '.gitmodules', '.eslintignore', 'src/index.css', 'index.html',
    'src/ui/src/design-system/styles.css', 'src/ui/src/design-system/tokens/tokens.tailwind.generated.css',
}
ROOT_THEME = {
    'product.schema.json', 'src/theme.compiled.json',
    'docs/theme-v2/mapa-v1-para-api-core.json',
}
EXTRA_TESTS = {
    'src/assets/illustrations/wallet-credits.svg': [
        'src/ui/src/components/PaymentOptionWallet/__tests__/walletIllustrations.test.jsx',
    ],
    'src/ui/src/design-system/components/': [
        'src/ui/src/design-system/components/__tests__/classes.test.js',
        'src/ui/src/styles/Rules/__tests__/Rules.test.js',
    ],
    'src/ui/src/design-system/components/Button.jsx': [
        'src/ui/src/design-system/lib/__tests__/buttonSkin.test.js',
    ],
    'src/ui/src/components/ProductShare/styles.js': [
        'src/ui/src/styles/Rules/__tests__/Rules.test.js',
    ],
    'src/utils/firebaseWebPush.js': [
        'src/utils/__tests__/firebaseWebPush.test.js',
    ],
    'src/ui/src/components/RenderProductsLayout/index.js': [
        'src/ui/src/components/RenderProductsLayout/__tests__/RenderProductsLayout.test.jsx',
    ],
}
WORKER_TEST_DIRS = ('src/__tests__/worker/', 'src/utils/__tests__/siteBranding.test.js')
WORKER_IMPORTS = {
    'src/utils/iconLinks.js', 'src/utils/imageTransform.js',
    'src/utils/seoDescription.js', 'src/theme.compiled.json',
}


def browser_catalog():
    return {path.relative_to(BROWSER_DIR).as_posix() for path in BROWSER_DIR.rglob('*.spec.js')}


def checked_registry():
    data = json.loads(REGISTRY.read_text(encoding='utf-8'))
    catalog = browser_catalog()
    mapped = {spec for group in data['groups'].values() for spec in group['specs']}
    if mapped != catalog:
        raise ValueError(f'Browser catalog drift. Add {sorted(catalog - mapped)}, remove {sorted(mapped - catalog)}.')
    return data, catalog


def pr_base(root, event_base):
    """The first parent of the PR merge ref is the base branch as it is now.

    The event's base SHA is the tip when the PR was opened or last synced; once the base
    branch moves, diffing from it counts everything that entered the base since as changed.
    """
    parents = subprocess.run(
        ['git', '-C', str(root), 'rev-list', '--parents', '-n', '1', 'HEAD'],
        capture_output=True, text=True, check=True,
    ).stdout.split()[1:]
    return parents[0] if len(parents) == 2 else event_base


def changed_paths(root, base, event):
    command = ['git', '-C', str(root)]
    if event == 'push':
        before = subprocess.run(
            [*command, 'merge-base', '--is-ancestor', base, 'HEAD'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        if before.returncode != 0:
            return None
    ref = f'{base}...HEAD' if event == 'pull_request' else base
    payload = subprocess.check_output([*command, 'diff', '--name-status', '-z', '--no-renames', ref, '--'])
    tokens = os.fsdecode(payload).split('\0')
    if tokens[-1] or len(tokens) % 2 != 1:
        raise ValueError('Invalid Git name-status output')
    return list(zip(tokens[0:-1:2], tokens[1:-1:2]))


def matching(path, pattern):
    if pattern.endswith('*'):
        return path.startswith(pattern[:-1])
    return path.startswith(pattern) if pattern.endswith('/') else path == pattern


def test_source(path):
    return '/__tests__/' in path or '.test.' in path or '.spec.' in path


def browser_specs(path, registry, catalog):
    if path.startswith('e2e/design/'):
        spec = path.removeprefix('e2e/design/')
        if spec in catalog:
            return {spec}
        if spec in ('product-modal.fixture.jsx', 'product-modal-test-utils.js'):
            return {test for test in catalog if test.startswith('product-modal')}
        return catalog
    groups = [group for group in registry['groups'].values() if any(
        matching(path, prefix) for prefix in group['paths']
    )]
    if groups:
        return {spec for group in groups for spec in group['specs']}
    return catalog


def classify(changes):
    registry, catalog = checked_registry()
    data = {
        'unit': 'none', 'browser': [], 'extra_tests': [], 'lint_files': [],
        'lint_all': False, 'ci_checks': False, 'design': False, 'entry': False,
        'schema': False, 'deploy': False, 'i18n': False,
    }
    browser, extras, lint = set(), set(), set()
    hits, direct = {}, set()

    def select(specs, own=False):
        # Ranking inputs for the PR cap: a catalog-wide fallback says nothing about relevance.
        browser.update(specs)
        if specs != catalog:
            for spec in specs:
                hits[spec] = hits.get(spec, 0) + 1
            if own:
                direct.update(specs)
    worker_only = bool(changes) and all(
        ((path.startswith(('worker/', *WORKER_TEST_DIRS)) and re.fullmatch(r'[\w/.-]+', path, re.ASCII))
         or path.endswith('.md')) for _, path in changes
    )
    all_source = changes is None
    lint_all = changes is None
    reasons = []
    for status, path in changes or []:
        if path.endswith('.md'):
            continue
        if path in GLOBAL_INPUTS or path.startswith(('tsconfig', '.eslintrc')):
            if status != 'D' and Path(path).suffix in JS_EXTENSIONS:
                lint.add(path)  # a global input (vite.config.js, setupTests.js…) is still code to lint
            all_source = True
            # Only a lint configuration change re-lints everything in the PR; main lints it all.
            lint_all = lint_all or path.startswith('.eslintrc') or path == '.eslintignore'
            reasons.append(path)
            continue
        if any(matching(path, prefix) for prefix in CI_PREFIXES):
            data['ci_checks'] = True
            continue
        if status != 'D' and Path(path).suffix in JS_EXTENSIONS:
            lint.add(path)
        if path in ROOT_THEME:
            data.update(schema=True, design=True, entry=True, i18n=True)
            all_source = True
            reasons.append(path)
        elif path.startswith(('tests/design/', 'scripts/design/')):
            data['design'] = True
            if path.startswith('scripts/design/'):
                data['entry'] = True
        elif path.startswith(('tests/cf-deploy/', 'scripts/cf-deploy', 'wrangler.')):
            data['deploy'] = True
        elif path.startswith('i18n/'):
            data.update(i18n=True, entry=True)
            if data['unit'] == 'none':
                data['unit'] = 'changed'
            browser.update(catalog)
        elif path.startswith('e2e/design/'):
            select(browser_specs(path, registry, catalog), own=True)
        elif path.startswith('e2e/'):
            # The production gate covers the design suite. Changes elsewhere
            # in e2e may affect shared helpers, so keep that suite eligible.
            browser.update(catalog)
        elif path.startswith(('src/', 'worker/', 'public/')):
            if status == 'D':
                # There is no module left to follow in Vitest's import graph.
                all_source = True
                reasons.append(path)
            elif data['unit'] == 'none':
                data['unit'] = 'changed'
            if not test_source(path) and not path.startswith('worker/'):
                data.update(design=True, entry=True, i18n=True)
                select(browser_specs(path, registry, catalog))
                if path.startswith(('src/ui/', 'src/pages/', 'src/components/', 'src/utils/')):
                    extras.add('src/utils/__tests__/keptWeights.test.js')
            for prefix, tests in EXTRA_TESTS.items():
                if matching(path, prefix):
                    extras.update(tests)
        else:
            all_source = True
            reasons.append(path)

    if all_source:
        data.update(unit='all', ci_checks=True, design=True,
                    entry=True, schema=True, deploy=True, i18n=True)
        browser = catalog
    related = [path for _, path in changes or [] if not path.endswith('.md')]
    if len(related) > MAX_LANE_PATHS:
        data['unit'], lint_all = 'all', True
    lint_all = lint_all or len(lint) > MAX_LANE_PATHS
    active_worker_scope = worker_only and data['unit'] == 'changed'
    # Most relevant first: specs edited in e2e/design, then those selected by the most changed
    # files, then by name. A catalog-wide fallback adds no hits, so it ranks after concrete groups.
    ranked = sorted(browser, key=lambda spec: (spec not in direct, -hits.get(spec, 0), spec))
    data.update(
        worker_only=active_worker_scope,
        browser=sorted(browser),
        browser_pr=ranked[:BROWSER_PR_CAP],
        browser_deferred=ranked[BROWSER_PR_CAP:],
        webkit=bool(browser.intersection(registry['webkit'])),
        lint_all=lint_all,
        lint_files=[] if lint_all else sorted(lint),
        extra_tests=[] if all_source else sorted(extras),
        changed_count=None if changes is None else len(changes),
        related_paths=[] if data['unit'] == 'all' else related,
        worker_contract=any(path.startswith('worker/') or path in WORKER_IMPORTS
                            for _, path in changes or []),
        broad_reasons=reasons if changes is not None else ['Push without a usable ancestor'],
    )
    data['submodules'] = bool(browser or data['entry'] or data['design'] or
                              (data['unit'] != 'none' and not active_worker_scope))
    # `large` only picks how unit runs in a PR: sharded (`all`) or related to the change.
    data['large'] = data['unit'] == 'all'
    data['install'] = bool(lint or browser or data['unit'] != 'none' or
                           any(data[key] for key in ('design', 'entry', 'schema', 'deploy', 'i18n')))
    return data


def run_checks(data, check):
    if check == 'lint':
        if data['lint_all']:
            subprocess.run(['pnpm', 'lint:check'], check=True)
        elif data['lint_files']:
            subprocess.run(['pnpm', 'exec', 'eslint', *[f'./{path}' for path in data['lint_files']]], check=True)
    elif check == 'unit':
        if data['unit'] == 'all':
            subprocess.run(['pnpm', 'test'], check=True)
        elif data['unit'] == 'changed':
            if data['worker_only']:
                subprocess.run(['pnpm', 'exec', 'vitest', 'run', '--pool=threads', '--passWithNoTests',
                                '--changed', data['base'], *WORKER_TEST_DIRS], check=True)
            else:
                subprocess.run(['pnpm', 'exec', 'vitest', 'related', '--run', '--pool=forks',
                                '--passWithNoTests', *[f'./{path}' for path in data['related_paths']]],
                               env={**os.environ, 'NODE_OPTIONS': '--max-old-space-size=4096'}, check=True)
            if data['extra_tests']:
                subprocess.run(['pnpm', 'test', *data['extra_tests']], check=True)
    elif check == 'browser':
        patterns = [f'(^|/){re.escape(spec)}$' for spec in data['browser']]
        if patterns:
            subprocess.run(['pnpm', 'test:design:browser', *patterns], check=True)


def previous_full_passed(api, sha):
    for event in ('schedule', 'workflow_dispatch', 'push'):
        filters = urllib.parse.urlencode({
            'branch': 'main', 'head_sha': sha, 'event': event, 'status': 'success', 'per_page': 30,
        })
        for run in api(f'actions/workflows/ci.yml/runs?{filters}')['workflow_runs']:
            if run['head_sha'] != sha:
                continue
            jobs = api(f"actions/runs/{run['id']}/jobs?filter=latest&per_page=100")['jobs']
            if any(job['name'] == 'Full CI Quality Gate' and job['conclusion'] == 'success'
                   for job in jobs):
                return True
    return False


def full_scope():
    def api(path):
        request = urllib.request.Request(
            f"{os.environ['GITHUB_API_URL']}/repos/{os.environ['GITHUB_REPOSITORY']}/{path}",
            headers={'Authorization': f"Bearer {os.environ['GH_TOKEN']}",
                     'Accept': 'application/vnd.github+json'},
        )
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.load(response)

    already_passed = False
    if os.environ['EVENT'] == 'schedule':
        try:
            already_passed = previous_full_passed(api, os.environ['GITHUB_SHA'])
        except (OSError, ValueError, KeyError) as error:
            print(f'Could not verify a previous full pass ({type(error).__name__}); running the full suite.')
    print('This commit already passed full CI.' if already_passed else 'Run the full suite for this commit.')
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
        print(f'run={str(not already_passed).lower()}', file=output)


# Triage output that asks for each lane (job id -> output, value). Everything else must be skipped.
PR_LANES = {
    'lint': ('lint', 'true'), 'checks': ('checks', 'true'), 'entry': ('entry', 'true'),
    'unit': ('unit', 'changed'), 'unit-shards': ('unit', 'all'), 'browser-pr': ('browser', 'true'),
}
FULL_JOBS = ('validation', 'browser', 'test', 'full-gate')


def gate(needs, event):
    """Problems that keep CI Quality Gate red; empty when every job that had to run succeeded.

    A pull request owes exactly the lanes its triage asked for. A push to main owes the full
    matrix, and its triage and lanes must not have run.
    """
    def result(job):
        return (needs.get(job) or {}).get('result', 'missing')

    expected = {}
    if event == 'pull_request':
        if result('scoped') != 'success':
            return [f'scoped: {result("scoped")}, expected success']
        outputs = needs['scoped'].get('outputs') or {}
        flags = ('lint', 'checks', 'entry', 'browser')
        if (outputs.get('unit') not in ('none', 'changed', 'all') or not outputs.get('scope')
                or any(outputs.get(flag) not in ('true', 'false') for flag in flags)):
            return ['scoped: success, but it produced no usable selection']
        expected = {job: 'success' if outputs.get(key) == value else 'skipped'
                    for job, (key, value) in PR_LANES.items()}
        expected.update({job: 'skipped' for job in ('full-scope', *FULL_JOBS)})
    elif event == 'push':
        expected = {job: 'skipped' for job in ('scoped', *PR_LANES)}
        expected.update({job: 'success' for job in ('full-scope', *FULL_JOBS)})
    else:
        return [f'unexpected event {event}']
    return [f'{job}: {result(job)}, expected {want}' for job, want in expected.items() if result(job) != want]


def lane_specs(specs, lane, lanes):
    """Round robin keeps the most relevant specs on different lanes."""
    return specs[lane - 1::lanes]


def playwright_version():
    lock = (ROOT / 'pnpm-lock.yaml').read_text(encoding='utf-8')
    match = re.search(r"'@playwright/test':\n\s+specifier: .+\n\s+version: (\S+)", lock)
    if not match:
        raise ValueError('@playwright/test is missing from pnpm-lock.yaml')
    return match.group(1)


def lane_payload(data):
    keys = ('unit', 'base', 'worker_only', 'related_paths', 'extra_tests', 'lint_all', 'lint_files')
    return {key: data[key] for key in keys}


def write_outputs(values):
    with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as output:
        for key, value in values.items():
            print(f'{key}={value}', file=output)


def write_summary(text):
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as summary:
            print(text, file=summary)


def triage(data):
    pr = data['browser_pr']
    lanes = min(BROWSER_PR_LANES, -(-len(pr) // BROWSER_SPECS_PER_LANE))
    flag = lambda value: str(bool(value)).lower()
    write_outputs({
        'scope': json.dumps(lane_payload(data), separators=(',', ':')),
        'unit': data['unit'],
        'lint': flag(data['lint_all'] or data['lint_files']),
        'checks': flag(any(data[key] for key in ('design', 'i18n', 'schema', 'deploy', 'worker_contract'))),
        **{key: flag(data[key]) for key in ('submodules', 'ci_checks', 'design', 'entry', 'schema', 'deploy',
                                            'i18n', 'worker_contract', 'large')},
        'browser': flag(pr),
        'browser_specs': json.dumps(pr, separators=(',', ':')),
        'browser_lanes': json.dumps(list(range(1, max(lanes, 1) + 1))),  # a matrix may not be empty
        'shards': json.dumps(list(range(1, UNIT_PR_SHARDS + 1))),
        'shard_total': UNIT_PR_SHARDS,
    })
    eslint = 'everything' if data['lint_all'] else f"{len(data['lint_files'])} file(s)"
    lines = ['### CI triage', '', f"- Vitest: `{data['unit']}`, ESLint: {eslint}"]
    if pr:
        lines.append(f'- Browser specs in this PR ({len(pr)} of {len(data["browser"])} selected, '
                     f'cap {BROWSER_PR_CAP}): ' + ', '.join(f'`{spec}`' for spec in pr))
    if data['browser_deferred']:
        lines.append(f'- Left for the full matrix on main ({len(data["browser_deferred"])}): '
                     + ', '.join(f'`{spec}`' for spec in data['browser_deferred']))
    write_summary('\n'.join(lines))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=('select', 'lint', 'unit', 'lane', 'browser', 'gate', 'full-scope'))
    command = parser.parse_args().command
    if command == 'full-scope':
        full_scope()
    elif command == 'gate':
        needs = json.loads(os.environ['NEEDS'])
        for job, state in needs.items():
            print(f"{job}: {state['result']}")
        problems = gate(needs, os.environ['EVENT'])
        print('\n'.join(problems) or 'Every job the triage asked for passed.')
        raise SystemExit(1 if problems else 0)
    elif command == 'select':
        event = os.environ['EVENT']
        if event != 'pull_request':
            raise ValueError(f'Unexpected scope event {event}')
        base = pr_base(ROOT, os.environ['BASE_SHA'])
        data = classify(changed_paths(ROOT, base, event))
        data['base'] = base
        print(json.dumps(data, indent=2))
        triage(data)
    elif command in ('lane', 'browser'):
        specs = lane_specs(json.loads(os.environ['BROWSER_SPECS']), int(os.environ['LANE']), int(os.environ['LANES']))
        if command == 'browser':
            run_checks({'browser': specs}, 'browser')
        else:
            registry = json.loads(REGISTRY.read_text(encoding='utf-8'))
            write_outputs({'webkit': str(bool(set(specs) & set(registry['webkit']))).lower(),
                           'playwright': playwright_version()})
    else:
        run_checks(json.loads(os.environ['CI_SCOPE']), command)


if __name__ == '__main__':
    main()
