import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from unittest.mock import patch

from scope import (
    BROWSER_PR_CAP, BROWSER_PR_LANES, ROOT, UNIT_PR_SHARDS, browser_catalog, changed_paths, classify, gate,
    lane_specs, playwright_version, pr_base, previous_full_passed, run_checks, triage,
)


class ScopeTests(unittest.TestCase):
    def test_docs_and_ci_metadata_avoid_node_and_browser(self):
        docs = classify([('M', 'docs/ci-runners.md')])
        ci = classify([('M', '.github/workflows/ci.yml'), ('M', 'ci/scope.py'), ('M', '.github/actions/node-deps/action.yml')])
        self.assertFalse(docs['install'])
        self.assertEqual(docs['unit'], 'none')
        self.assertFalse(ci['install'])
        self.assertTrue(ci['ci_checks'])

    def test_seo_used_only_by_worker_gets_scoped_unit_and_lint(self):
        scope = classify([('M', 'worker/seo.js')])
        self.assertEqual(scope['unit'], 'changed')
        self.assertTrue(scope['worker_only'])
        self.assertEqual(scope['lint_files'], ['worker/seo.js'])
        self.assertEqual(scope['browser'], [])
        self.assertFalse(scope['submodules'])
        self.assertFalse(scope['entry'])
        self.assertTrue(scope['worker_contract'])

    def test_checkout_scope_selects_browser_and_frontend_controls(self):
        scope = classify([('M', 'src/ui/src/components/Checkout/index.js')])
        self.assertIn('checkout-rtl.spec.js', scope['browser'])
        self.assertNotIn('store-search.spec.js', scope['browser'])
        self.assertTrue(scope['entry'])
        self.assertTrue(scope['design'])
        self.assertTrue(scope['i18n'])
        self.assertTrue(scope['submodules'])

    def test_shared_dependencies_and_deleted_source_have_conservative_fallback(self):
        for path in ('pnpm-lock.yaml', 'src/@/components', 'src/index.css'):
            with self.subTest(path=path):
                scope = classify([('M', path)])
                self.assertEqual(scope['unit'], 'all')
                self.assertEqual(set(scope['browser']), browser_catalog())
        self.assertEqual(classify([('D', 'src/utils/deleted.js')])['unit'], 'all')

    def test_large_only_means_sharded_unit_never_a_browser_matrix(self):
        self.assertTrue(classify([('M', 'pnpm-lock.yaml')])['large'])
        for change in ('i18n/en.json', 'worker/seo.js', 'docs/ci-runners.md', 'e2e/design/cart-tooltip.spec.js',
                       'src/ui/src/components/ProductForm/index.js'):
            with self.subTest(change=change):
                self.assertFalse(classify([('M', change)])['large'])
        everything = classify([('M', 'pnpm-lock.yaml')])
        self.assertEqual(len(everything['browser']), len(browser_catalog()))
        self.assertEqual(len(everything['browser_pr']), BROWSER_PR_CAP)

    def test_file_read_without_import_adds_only_owned_unit_test(self):
        scope = classify([('M', 'src/assets/illustrations/wallet-credits.svg')])
        self.assertIn('src/ui/src/components/PaymentOptionWallet/__tests__/walletIllustrations.test.jsx',
                      scope['extra_tests'])

    def test_exact_browser_spec_uses_webkit_only_when_needed(self):
        scope = classify([('M', 'e2e/design/cart-tooltip.spec.js')])
        self.assertEqual(scope['browser'], ['cart-tooltip.spec.js'])
        self.assertTrue(scope['webkit'])
        scope = classify([('M', 'e2e/design/store-search.spec.js')])
        self.assertEqual(scope['browser'], ['store-search.spec.js'])
        self.assertFalse(scope['webkit'])

    def test_browser_fixture_consumes_catalog_style(self):
        scope = classify([('M', 'src/ui/src/components/BusinessListingSearch/styles.js')])
        self.assertIn('review-fix2.spec.js', scope['browser'])

    def test_worker_only_change_runs_scoped_vitest_and_lint_of_its_files(self):
        data = classify([('M', 'worker/seo.js')])
        data['base'] = 'origin/main'
        with patch('scope.subprocess.run') as patched:
            run_checks(data, 'lint')
            run_checks(data, 'unit')
        args = [tuple(call.args[0]) for call in patched.call_args_list]
        self.assertIn(('pnpm', 'exec', 'eslint', './worker/seo.js'), args)
        self.assertTrue(any('--changed' in call and 'origin/main' in call for call in args))

    def test_worker_contract_also_follows_worker_imports(self):
        for path in ('worker/index.js', 'src/utils/iconLinks.js', 'src/utils/seoDescription.js'):
            with self.subTest(path=path):
                self.assertTrue(classify([('M', path)])['worker_contract'])

    def test_unicode_source_path_passes_to_vitest_unchanged(self):
        source = 'src/utils/máy-be.js'
        scope = classify([('M', source)])
        self.assertEqual(scope['related_paths'], [source])
        with patch('scope.subprocess.run') as run:
            run_checks(scope, 'unit')
        args = run.call_args_list[0].args[0]
        self.assertIn('related', args)
        self.assertIn('--passWithNoTests', args)
        self.assertIn('./src/utils/máy-be.js', args)

    def test_only_completed_full_gate_for_this_sha_can_skip_weekly(self):
        sha = 'a' * 40
        def api(path):
            if '/jobs' in path:
                return {'jobs': [
                    {'name': 'CI Quality Gate', 'conclusion': 'success'},
                    {'name': 'Full CI Quality Gate', 'conclusion': 'success' if '/2/' in path else 'skipped'},
                ]}
            self.assertIn(f'head_sha={sha}', path)
            return {'workflow_runs': [{'id': 1, 'head_sha': sha}, {'id': 2, 'head_sha': sha}]}
        self.assertTrue(previous_full_passed(api, sha))

    def test_scope_registry_accounts_for_every_browser_spec(self):
        registry = json.loads((ROOT / 'ci/affected-browser.json').read_text())
        mapped = {spec for group in registry['groups'].values() for spec in group['specs']}
        self.assertEqual(mapped, browser_catalog())
        self.assertEqual(set(registry['webkit']), {
            path.name for path in (ROOT / 'e2e/design').glob('*.spec.js')
            if 'webkit.launch' in path.read_text()
        })


class BrowserCapTests(unittest.TestCase):
    def test_pr_cap_fits_the_lanes_and_keeps_the_rest_for_main(self):
        scope = classify([('M', 'src/ui/src/components/ProductForm/index.js'),
                          ('M', 'src/ui/src/components/ProductForm/styles.js'),
                          ('M', 'src/ui/src/components/ProductForm/helpers.js')])
        self.assertEqual(len(scope['browser_pr']), BROWSER_PR_CAP)
        self.assertEqual(sorted(scope['browser_pr'] + scope['browser_deferred']), scope['browser'])
        self.assertEqual(scope['unit'], 'changed')
        self.assertFalse(scope['large'])
        self.assertEqual(len(scope['related_paths']), 3)

    def test_directly_edited_specs_come_first_then_most_hits_then_groups_over_the_catalog_wildcard(self):
        scope = classify([('M', 'e2e/design/touch-hover.spec.js'),
                          ('M', 'src/ui/src/components/Checkout/index.js'),
                          ('M', 'src/ui/src/components/Cart/index.js'),
                          ('M', 'src/ui/src/components/Business/index.js')])
        ranked = scope['browser_pr']
        self.assertEqual(ranked[0], 'touch-hover.spec.js')
        registry = json.loads((ROOT / 'ci/affected-browser.json').read_text())
        both = set(registry['groups']['checkout']['specs'])
        # Checkout and Cart select the same group twice; Business selects the catalog group once.
        self.assertTrue(set(ranked[1:]) <= both)
        self.assertEqual(ranked[1:], sorted(ranked[1:]))

        wildcard = classify([('M', 'src/unknown-area/thing.js'), ('M', 'src/ui/src/components/Checkout/index.js')])
        concrete = set(registry['groups']['checkout']['specs'])
        self.assertTrue(set(wildcard['browser_pr']) <= concrete)

    def test_selection_under_the_cap_is_complete_and_ranking_is_deterministic(self):
        one = classify([('M', 'e2e/design/store-search.spec.js')])
        self.assertEqual((one['browser_pr'], one['browser_deferred']), (['store-search.spec.js'], []))
        change = [('M', 'src/ui/src/components/Checkout/index.js')]
        self.assertEqual(classify(change)['browser_pr'], classify(list(reversed(change)))['browser_pr'])

    def test_lanes_share_the_ranked_specs_round_robin(self):
        specs = [f's{n}.spec.js' for n in range(8)]
        self.assertEqual(lane_specs(specs, 1, 4), ['s0.spec.js', 's4.spec.js'])
        lanes = [lane_specs(specs, lane, BROWSER_PR_LANES) for lane in range(1, BROWSER_PR_LANES + 1)]
        self.assertEqual(sorted(sum(lanes, [])), specs)
        self.assertTrue(all(len(lane) == BROWSER_PR_CAP // BROWSER_PR_LANES for lane in lanes))

    def test_playwright_version_comes_from_the_lockfile(self):
        self.assertRegex(playwright_version(), r'^\d+\.\d+\.\d+$')


class LintAndShardTests(unittest.TestCase):
    def test_only_a_lint_configuration_change_lints_everything_in_a_pr(self):
        typical = classify([('M', 'src/ui/src/components/ProductForm/index.js')])
        self.assertFalse(typical['lint_all'])
        self.assertEqual(typical['lint_files'], ['src/ui/src/components/ProductForm/index.js'])
        for path in ('.eslintrc.js', '.eslintignore'):
            with self.subTest(path=path):
                self.assertTrue(classify([('M', path)])['lint_all'])
        lock = classify([('M', 'package.json')])
        self.assertFalse(lock['lint_all'])
        self.assertEqual(lock['unit'], 'all')

    def test_javascript_global_inputs_are_linted_before_they_widen_the_selection(self):
        for path in ('vite.config.js', 'src/setupTests.js', 'playwright.design.config.js'):
            with self.subTest(path=path):
                scope = classify([('M', path)])
                self.assertEqual(scope['unit'], 'all')
                self.assertEqual(scope['lint_files'], [path])
        self.assertEqual(classify([('D', 'vite.config.js')])['lint_files'], [])
        self.assertEqual(classify([('M', 'package.json')])['lint_files'], [])

    def test_huge_changes_fall_back_to_everything_instead_of_overflowing_the_lane_payload(self):
        paths = [('M', f'src/utils/file{n}.js') for n in range(400)]
        scope = classify(paths)
        self.assertEqual((scope['unit'], scope['lint_all'], scope['related_paths'], scope['lint_files']),
                         ('all', True, [], []))

    def test_triage_outputs_turn_on_the_lanes(self):
        with tempfile.NamedTemporaryFile('r+') as output, patch.dict('os.environ', {'GITHUB_OUTPUT': output.name}):
            scope = classify([('M', 'src/ui/src/components/ProductForm/index.js')])
            scope['base'] = 'abc'
            triage(scope)
            values = dict(line.split('=', 1) for line in Path(output.name).read_text().splitlines())
        self.assertEqual((values['lint'], values['checks'], values['entry'], values['unit']),
                         ('true', 'true', 'true', 'changed'))
        self.assertEqual(json.loads(values['browser_lanes']), list(range(1, BROWSER_PR_LANES + 1)))
        self.assertEqual(len(json.loads(values['shards'])), UNIT_PR_SHARDS)
        self.assertEqual(json.loads(values['scope'])['related_paths'], ['src/ui/src/components/ProductForm/index.js'])

    def test_docs_only_pr_asks_for_no_lane(self):
        with tempfile.NamedTemporaryFile('r+') as output, patch.dict('os.environ', {'GITHUB_OUTPUT': output.name}):
            scope = classify([('M', 'docs/ci-runners.md')])
            scope['base'] = 'abc'
            triage(scope)
            values = dict(line.split('=', 1) for line in Path(output.name).read_text().splitlines())
        for key in ('lint', 'checks', 'entry', 'browser'):
            self.assertEqual(values[key], 'false', key)
        self.assertEqual(values['unit'], 'none')
        self.assertEqual(json.loads(values['browser_lanes']), [1])  # a matrix cannot be empty


class GateTests(unittest.TestCase):
    OUTPUTS = {'scope': '{}', 'unit': 'changed', 'lint': 'true', 'checks': 'true', 'entry': 'true', 'browser': 'true'}

    def needs(self, **results):
        jobs = {job: {'result': 'skipped', 'outputs': {}} for job in
                ('scoped', 'lint', 'checks', 'entry', 'unit', 'unit-shards', 'browser-pr',
                 'full-scope', 'validation', 'browser', 'test', 'full-gate')}
        jobs['scoped'] = {'result': 'success', 'outputs': self.OUTPUTS}
        for job in ('lint', 'checks', 'entry', 'unit', 'browser-pr'):
            jobs[job]['result'] = 'success'
        for job, result in results.items():
            jobs[job.replace('_', '-')]['result'] = result
        return jobs

    def test_pr_passes_when_every_requested_lane_succeeded_and_the_others_were_skipped(self):
        self.assertEqual(gate(self.needs(), 'pull_request'), [])

    def test_pr_fails_when_a_requested_lane_did_not_succeed(self):
        for result in ('failure', 'cancelled', 'skipped', 'missing'):
            for lane in ('lint', 'checks', 'entry', 'unit', 'browser_pr'):
                with self.subTest(lane=lane, result=result):
                    self.assertEqual(len(gate(self.needs(**{lane: result}), 'pull_request')), 1)

    def test_pr_fails_when_the_triage_did_not_succeed_or_asked_for_nothing_usable(self):
        self.assertEqual(len(gate(self.needs(scoped='failure'), 'pull_request')), 1)
        empty = self.needs()
        empty['scoped']['outputs'] = {}
        self.assertEqual(len(gate(empty, 'pull_request')), 1)

    def test_pr_fails_when_a_lane_that_was_not_asked_for_ran(self):
        self.assertEqual(len(gate(self.needs(unit_shards='success'), 'pull_request')), 1)
        self.assertEqual(len(gate(self.needs(test='success'), 'pull_request')), 1)

    def test_pr_with_all_unit_requires_the_shards_not_the_related_lane(self):
        needs = self.needs(unit='skipped', unit_shards='success')
        needs['scoped']['outputs'] = {**self.OUTPUTS, 'unit': 'all'}
        self.assertEqual(gate(needs, 'pull_request'), [])
        needs['unit-shards']['result'] = 'failure'
        self.assertEqual(len(gate(needs, 'pull_request')), 1)

    def test_pr_fails_when_the_triage_left_out_a_lane_decision(self):
        for flag in ('lint', 'checks', 'entry', 'browser'):
            for value in (None, '', 'yes'):
                with self.subTest(flag=flag, value=value):
                    needs = self.needs()
                    outputs = {key: val for key, val in self.OUTPUTS.items() if key != flag}
                    if value is not None:
                        outputs[flag] = value
                    needs['scoped']['outputs'] = outputs
                    self.assertEqual(len(gate(needs, 'pull_request')), 1)

    def test_docs_only_pr_needs_only_the_triage(self):
        needs = self.needs(lint='skipped', checks='skipped', entry='skipped', unit='skipped', browser_pr='skipped')
        needs['scoped']['outputs'] = {**self.OUTPUTS, 'unit': 'none', 'lint': 'false', 'checks': 'false',
                                      'entry': 'false', 'browser': 'false'}
        self.assertEqual(gate(needs, 'pull_request'), [])

    def test_push_to_main_owes_the_full_matrix_and_no_lane(self):
        needs = self.needs(scoped='skipped', lint='skipped', checks='skipped', entry='skipped', unit='skipped',
                           browser_pr='skipped', full_scope='success', validation='success', browser='success',
                           test='success', full_gate='success')
        self.assertEqual(gate(needs, 'push'), [])
        for job in ('full_scope', 'validation', 'browser', 'test', 'full_gate'):
            for result in ('failure', 'skipped', 'cancelled'):
                with self.subTest(job=job, result=result):
                    broken = {**needs, job.replace('_', '-'): {'result': result, 'outputs': {}}}
                    self.assertEqual(len(gate(broken, 'push')), 1)
        self.assertEqual(len(gate({**needs, 'lint': {'result': 'success'}}, 'push')), 1)

    def test_other_events_never_pass(self):
        self.assertTrue(gate(self.needs(), 'schedule'))


class GitDiffTests(unittest.TestCase):
    def test_pr_base_is_the_current_base_not_the_stale_event_sha(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = Path(folder)
            git = lambda *args: subprocess.check_output(['git', '-C', folder, *args], text=True).strip()
            git('init', '-q', '-b', 'main')
            git('config', 'user.name', 'CI Test')
            git('config', 'user.email', 'ci@example.invalid')
            (repo / 'a.txt').write_text('1')
            git('add', '.')
            git('commit', '-qm', 'old base')
            old = git('rev-parse', 'HEAD')
            git('checkout', '-q', '-b', 'pr')
            (repo / 'pr.txt').write_text('pr')
            git('add', '.')
            git('commit', '-qm', 'pr')
            git('checkout', '-q', 'main')
            (repo / 'main.txt').write_text('moved')
            git('add', '.')
            git('commit', '-qm', 'main moved after the PR opened')
            new = git('rev-parse', 'HEAD')
            git('merge', '-q', '--no-ff', '-m', 'merge ref', 'pr')
            self.assertEqual(pr_base(repo, old), new)
            self.assertEqual({path for _, path in changed_paths(repo, pr_base(repo, old), 'pull_request')},
                             {'pr.txt'})
            git('checkout', '-q', 'pr')
            self.assertEqual(pr_base(repo, old), old)  # not a merge commit: keep the event base

    def test_rename_preserves_both_paths_and_spaces(self):
        with tempfile.TemporaryDirectory() as folder:
            repo = Path(folder)
            git = lambda *args: subprocess.check_output(['git', '-C', folder, *args], text=True)
            git('init', '-q')
            git('config', 'user.name', 'CI Test')
            git('config', 'user.email', 'ci@example.invalid')
            (repo / 'old file.js').write_text('export const value = 1\n')
            git('add', '.')
            git('commit', '-qm', 'base')
            base = git('rev-parse', 'HEAD').strip()
            git('mv', 'old file.js', 'new file.js')
            git('commit', '-qm', 'rename')

            self.assertEqual(set(changed_paths(repo, base, 'pull_request')),
                             {('A', 'new file.js'), ('D', 'old file.js')})
            self.assertIsNone(changed_paths(repo, 'ref-does-not-exist', 'push'))
            with self.assertRaises(subprocess.CalledProcessError):
                changed_paths(repo, 'ref-does-not-exist', 'pull_request')


if __name__ == '__main__':
    unittest.main()
