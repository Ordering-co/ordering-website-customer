import io
import itertools
import unittest
import urllib.error
import urllib.parse

import fallback


REPO = 'Finitless-com/website-marketplace-theming'
RUN = {
    'id': 100,
    'event': 'pull_request',
    'name': 'CI Quality Gate',
    'path': '.github/workflows/ci.yml',
    'head_branch': 'feature',
    'head_sha': 'abc',
    'pull_requests': [{'number': 7}],
    'repository': {'full_name': REPO},
    'head_repository': {'full_name': REPO},
    'actor': {'login': 'maintainer', 'type': 'User'},
    'triggering_actor': {'login': 'maintainer', 'type': 'User'},
    'run_attempt': 1,
    'status': 'in_progress',
    'created_at': '2026-01-01T00:00:00Z',
    'run_started_at': '2026-01-01T00:00:00Z',
    'updated_at': '2026-01-01T00:00:00Z',
}
START = fallback.timestamp(RUN['created_at'])
QUEUED = {'name': 'Unit tests', 'status': 'queued',
          'labels': ['self-hosted', 'Linux', 'ARM64', 'website-theming-ci']}
LIVE = 'actions/runs/100'
CANCEL = ('POST', f'{LIVE}/cancel')
RERUN = ('POST', f'{LIVE}/rerun')
RERUN_FAILED = ('POST', f'{LIVE}/rerun-failed-jobs')
JOBS = f'{LIVE}/attempts/1/jobs?per_page=100'
GATE_STEP = 'Check every job the triage asked for'


def triage(completed_at='2026-01-01T00:00:15Z'):
    return {'name': 'Triage', 'status': 'completed', 'conclusion': 'success', 'completed_at': completed_at}


class JobDecisionTests(unittest.TestCase):
    def test_only_the_exact_unit_lane_on_the_mac_can_trigger_fallback(self):
        for overrides in (
            {'name': 'Tests (shard 1/4)'},
            {'name': 'Unit tests / nested'},
            {'name': 'Unit tests (changed)'},
            {'name': 'Mac dependency cache'},
            {'labels': ['self-hosted', 'other-pool']},
            {'labels': ['self-hosted', 'website-theming-ci-offline-drill-2']},
            {'labels': ['ubuntu-latest']},
        ):
            with self.subTest(overrides=overrides):
                job = {**QUEUED, **overrides}
                self.assertNotEqual(fallback.decision([job], START + 120, START)[0], 'fallback')

    def test_drill_label_stands_in_for_the_mac_so_the_fallback_can_be_rehearsed(self):
        job = {**QUEUED, 'labels': ['self-hosted', 'Linux', 'ARM64', 'website-theming-ci-offline-drill']}
        self.assertEqual(fallback.decision([job], START + 20, START)[0], 'fallback')

    def test_gate_reporting_a_failed_lane_does_not_hide_the_mac_failure(self):
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'failure'}
        gate = {'name': 'CI Quality Gate', 'status': 'completed', 'conclusion': 'failure',
                'steps': [{'name': GATE_STEP, 'conclusion': 'failure'}]}
        self.assertEqual(fallback.decision([failed, gate], START + 20, START)[0], 'fallback')

    def test_any_other_failed_gate_step_is_a_real_failure(self):
        gate = {'name': 'CI Quality Gate', 'status': 'completed', 'conclusion': 'failure',
                'steps': [{'name': 'Set up job', 'conclusion': 'failure'}]}
        self.assertEqual(fallback.decision([QUEUED, gate], START + 20, START)[0], 'stop')

    def test_a_failure_in_any_other_lane_wins_over_the_mac_queue(self):
        for name in ('Lint', 'Checks', 'Entry size', 'Browser (lane 1)', 'Tests (shard 2/12)'):
            with self.subTest(name=name):
                failed = {'name': name, 'status': 'completed', 'conclusion': 'failure'}
                self.assertEqual(fallback.decision([QUEUED, failed], START + 20, START)[0], 'stop')

    def test_a_lint_step_failure_wins_while_the_job_is_still_in_progress(self):
        lint = {'name': 'Lint', 'status': 'in_progress', 'steps': [{'name': 'ESLint', 'conclusion': 'failure'}]}
        self.assertEqual(fallback.decision([QUEUED, lint], START + 20, START)[0], 'stop')

    def test_cancelled_job_prevents_cancel_and_retry_of_an_active_run(self):
        canceled = {'name': 'Lint', 'status': 'completed', 'conclusion': 'cancelled'}
        self.assertEqual(fallback.decision([QUEUED, canceled], START + 20, START)[0], 'stop')

    def test_queue_threshold_only_applies_to_the_mac(self):
        self.assertEqual(fallback.decision([QUEUED], START + 19, START)[0], 'wait')
        self.assertEqual(fallback.decision([QUEUED], START + 20, START)[0], 'fallback')
        github = {**QUEUED, 'labels': ['ubuntu-latest']}
        self.assertEqual(fallback.decision([github], START + 120, START)[0], 'stop')  # nothing on the Mac

    def test_queue_time_counts_from_the_end_of_the_triage(self):
        self.assertEqual(fallback.decision([QUEUED, triage()], START + 34, START)[0], 'wait')
        self.assertEqual(fallback.decision([QUEUED, triage()], START + 35, START)[0], 'fallback')

    def test_stalled_step_can_fall_back_but_recent_progress_preserves_run(self):
        job = {**QUEUED, 'status': 'in_progress', 'steps': [
            {'name': 'Run tests', 'started_at': '2026-01-01T00:03:00Z'},
        ]}
        self.assertEqual(fallback.decision([job], START + 1200, START)[0], 'wait')
        self.assertEqual(fallback.decision([job], START + 1380, START)[0], 'fallback')

    def test_real_test_failure_wins_even_before_the_job_finishes(self):
        failed = {**QUEUED, 'status': 'in_progress', 'steps': [{'name': 'Run tests', 'conclusion': 'failure'}]}
        self.assertEqual(fallback.decision([failed], START + 20, START)[0], 'stop')

    def test_job_timeout_during_the_command_is_preserved(self):
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'timed_out',
                  'steps': [{'name': 'Run tests', 'conclusion': 'cancelled', 'started_at': RUN['created_at']}]}
        self.assertEqual(fallback.decision([failed], START + 1900, START)[0], 'stop')

    def test_stale_mac_runner_during_test_can_fall_back(self):
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'stale',
                  'steps': [{'name': 'Run tests', 'conclusion': 'cancelled', 'started_at': RUN['created_at']}]}
        self.assertEqual(fallback.decision([failed], START + 1900, START)[0], 'fallback')

    def test_job_timeout_before_the_command_can_fall_back(self):
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'timed_out',
                  'steps': [{'name': 'Run tests', 'conclusion': 'skipped', 'started_at': '0001-01-01T00:00:00Z'}]}
        self.assertEqual(fallback.decision([failed], START + 1900, START)[0], 'fallback')

    def test_infrastructure_failure_after_checkout_can_fall_back(self):
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'failure',
                  'steps': [{'name': 'Check Vitest workspace', 'conclusion': 'failure'}]}
        self.assertEqual(fallback.decision([failed], START + 20, START)[0], 'fallback')

    def test_a_finished_lane_needs_no_more_monitoring(self):
        lane = {**QUEUED, 'status': 'completed', 'conclusion': 'success'}
        self.assertEqual(fallback.decision([lane, triage()], START + 60, START)[0], 'stop')

    def test_no_unit_lane_after_the_triage_ends_the_monitoring(self):
        self.assertEqual(fallback.decision([], START + 5, START)[0], 'wait')
        self.assertEqual(fallback.decision([triage()], START + 24, START)[0], 'wait')
        self.assertEqual(fallback.decision([triage()], START + 25, START)[0], 'stop')
        self.assertEqual(fallback.decision([QUEUED, triage()], START + 25, START)[0], 'wait')


class FakeGitHub:
    def __init__(self, run=RUN, jobs=(QUEUED,), on_cancel=None, rerun_failed=None, pr_open=True):
        self.run = run.copy()
        self.jobs = jobs
        self.on_cancel = on_cancel
        self.rerun_failed = rerun_failed
        self.pr_open = pr_open
        self.calls = []

    @property
    def writes(self):
        return [call for call in self.calls if call[0] == 'POST']

    def __call__(self, method, path):
        self.calls.append((method, path))
        if (method, path) == CANCEL:
            if self.on_cancel:
                self.on_cancel(self)
            else:
                self.run.update(status='completed', conclusion='cancelled')
            return {}
        if (method, path) == RERUN:
            return {}
        if (method, path) == RERUN_FAILED:
            if self.rerun_failed:
                return self.rerun_failed(self)
            self.run['run_attempt'] += 1
            return {}
        if (method, path) == ('GET', 'pulls/7'):
            return {'state': 'open' if self.pr_open else 'closed', 'head': {'sha': 'abc'}}
        if method == 'GET' and path == LIVE:
            return self.run.copy()
        if method == 'GET' and path == f"{LIVE}/attempts/{self.run['run_attempt']}/jobs?per_page=100":
            return {'jobs': self.jobs}
        raise AssertionError((method, path))


def event_for(run=RUN):
    return {'action': 'in_progress', 'workflow_run': run,
            'repository': {'full_name': REPO, 'default_branch': 'main'}}


class RecoveryTests(unittest.TestCase):
    def monitor(self, api, run=RUN):
        return fallback.monitor(api, event_for(run), lambda: START + 125,
                                lambda _: self.fail('Unexpected wait'), lambda _: None)

    def test_monitor_cancels_then_reruns_only_what_failed(self):
        api = FakeGitHub()
        self.assertTrue(self.monitor(api))
        self.assertEqual(api.writes, [CANCEL, RERUN_FAILED])
        self.assertIn(('GET', JOBS), api.calls)

    def test_monitor_can_resolve_identity_from_a_minimal_webhook(self):
        api = FakeGitHub()
        self.assertTrue(self.monitor(api, {'id': 100, 'event': 'pull_request', 'run_attempt': 1}))
        self.assertEqual(api.writes, [CANCEL, RERUN_FAILED])

    def test_mac_that_starts_before_cancellation_stays_running(self):
        class RunnerRecovers(FakeGitHub):
            def __call__(self, method, path):
                if method == 'GET' and path == JOBS and (method, path) in self.calls:
                    self.jobs = [{**QUEUED, 'status': 'in_progress'}]
                return super().__call__(method, path)

        api = RunnerRecovers()
        self.assertFalse(self.monitor(api))
        self.assertEqual(api.writes, [])

    def test_lanes_cancelled_by_fallback_do_not_block_its_rerun(self):
        def on_cancel(api):
            api.run.update(status='completed', conclusion='cancelled')
            api.jobs = [
                {**QUEUED, 'status': 'completed', 'conclusion': 'cancelled'},
                {'name': 'Lint', 'status': 'completed', 'conclusion': 'cancelled'},
                {'name': 'Browser (lane 1)', 'status': 'completed', 'conclusion': 'cancelled'},
            ]

        api = FakeGitHub(on_cancel=on_cancel)
        self.assertTrue(self.monitor(api))
        self.assertEqual(api.writes, [CANCEL, RERUN_FAILED])

    def test_monitor_rejects_untrusted_or_stale_runs(self):
        for overrides in (
            {'id': 101}, {'event': 'workflow_dispatch'}, {'event': 'push', 'head_branch': 'main'},
            {'run_attempt': 2}, {'event': 'workflow_run'},
            {'repository': {'full_name': 'fork/website-marketplace-theming'}},
            {'head_repository': {'full_name': 'fork/website-marketplace-theming'}},
            {'path': '.github/workflows/runner-fallback.yml'},
            {'triggering_actor': {'login': 'other[bot]', 'type': 'Bot'}},
            {'actor': {'login': 'dependabot[bot]', 'type': 'Bot'}},
        ):
            with self.subTest(overrides=overrides):
                api = FakeGitHub({**RUN, **overrides})
                self.assertFalse(self.monitor(api))
                self.assertEqual(api.calls, [('GET', LIVE)])

    def test_run_is_recovered_only_while_its_pr_is_open_at_the_same_commit(self):
        for pr_open, sha, writes in ((True, 'abc', [CANCEL, RERUN_FAILED]), (False, 'abc', []),
                                     (True, 'def', [])):
            with self.subTest(pr_open=pr_open, sha=sha):
                run = {**RUN, 'head_sha': sha}
                api = FakeGitHub(run, pr_open=pr_open)
                self.monitor(api, run)
                self.assertEqual(api.writes, writes)

    def test_pr_monitor_finds_the_run_for_the_pushed_commit_and_ignores_forks_and_labels(self):
        class Api(FakeGitHub):
            def __call__(self, method, path):
                if path.startswith('actions/workflows/ci.yml/runs?'):
                    self.calls.append((method, path))
                    query = urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)
                    assert query['head_sha'] == ['abc'] and query['event'] == ['pull_request']
                    return {'workflow_runs': [{**RUN, 'id': 99, 'head_sha': 'zzz'}, RUN]}
                return super().__call__(method, path)

        event = {'action': 'synchronize', 'repository': {'full_name': REPO, 'default_branch': 'main'},
                 'pull_request': {'head': {'sha': 'abc', 'repo': {'full_name': REPO}}}}
        api = Api()
        fallback.monitor_pull_request(api, event, lambda: START + 125, lambda _: None, lambda _: None)
        self.assertIn(('GET', JOBS), api.calls)
        fork = {**event, 'pull_request': {'head': {'sha': 'abc', 'repo': {'full_name': 'fork/x'}}}}
        labeled = {**event, 'action': 'labeled'}
        for ignored in (fork, labeled):
            api = Api()
            self.assertFalse(fallback.monitor_pull_request(api, ignored, lambda: START, lambda _: None, print))
            self.assertEqual(api.calls, [])

    def test_monitor_leaves_completed_cancellations_and_skips_alone(self):
        for conclusion in ('cancelled', 'skipped', 'success'):
            with self.subTest(conclusion=conclusion):
                api = FakeGitHub({**RUN, 'status': 'completed', 'conclusion': conclusion})
                self.assertFalse(self.monitor(api))
                self.assertEqual(api.calls, [('GET', LIVE)])

    def test_race_with_external_cancellation_does_not_rerun(self):
        def on_cancel(_api):
            raise urllib.error.HTTPError(LIVE, 409, 'Conflict', {}, io.BytesIO())

        api = FakeGitHub(on_cancel=on_cancel)
        self.assertFalse(self.monitor(api))
        self.assertEqual(api.writes, [CANCEL])

    def test_attempt_change_after_cancel_does_not_rerun(self):
        def on_cancel(api):
            api.run.update(run_attempt=2)

        api = FakeGitHub(on_cancel=on_cancel)
        self.assertFalse(self.monitor(api))
        self.assertEqual(api.writes, [CANCEL])

    def test_real_test_failure_appearing_during_cancellation_blocks_rerun(self):
        def on_cancel(api):
            api.run.update(status='completed', conclusion='cancelled')
            api.jobs = [{**QUEUED, 'status': 'completed', 'conclusion': 'failure',
                         'steps': [{'name': 'Run tests', 'conclusion': 'failure'}]}]

        api = FakeGitHub(on_cancel=on_cancel)
        self.assertFalse(self.monitor(api))
        self.assertEqual(api.writes, [CANCEL])

    def test_completed_run_with_an_infrastructure_failure_is_rerun_without_cancelling(self):
        run = {**RUN, 'status': 'completed', 'conclusion': 'failure'}
        failed = {**QUEUED, 'status': 'completed', 'conclusion': 'failure',
                  'steps': [{'name': 'Check Vitest workspace', 'conclusion': 'failure'}]}
        api = FakeGitHub(run, jobs=[failed])
        self.assertTrue(self.monitor(api, run))
        self.assertEqual(api.writes, [RERUN_FAILED])

    def test_rerun_failed_jobs_that_opens_no_attempt_or_is_rejected_falls_back_to_a_full_rerun(self):
        def rejected(_api):
            raise urllib.error.HTTPError(LIVE, 422, 'Unprocessable', {}, io.BytesIO())

        for rerun_failed in (lambda api: {}, rejected):
            with self.subTest(rerun_failed=rerun_failed):
                api = FakeGitHub(rerun_failed=rerun_failed)
                ticks = itertools.count(START + 125)
                self.assertTrue(fallback.monitor(api, event_for(), lambda: next(ticks), lambda _: None,
                                                 lambda _: None))
                self.assertEqual(api.writes, [CANCEL, RERUN_FAILED, RERUN])

    def test_the_wait_for_the_new_attempt_is_short(self):
        ticks = itertools.count(START + 125)
        api = FakeGitHub(rerun_failed=lambda api: {})
        fallback.monitor(api, event_for(), lambda: next(ticks), lambda _: None, lambda _: None)
        polls = [call for call in api.calls if call == ('GET', LIVE)]
        self.assertLessEqual(len(polls), 20)
        self.assertEqual(fallback.ATTEMPT_SECONDS, 8)

    def test_a_pr_closed_while_waiting_for_the_new_attempt_is_not_fully_rerun(self):
        def closes(api):
            api.pr_open = False
            return {}

        ticks = itertools.count(START + 125)
        api = FakeGitHub(rerun_failed=closes)
        self.assertFalse(fallback.monitor(api, event_for(), lambda: next(ticks), lambda _: None, lambda _: None))
        self.assertEqual(api.writes, [CANCEL, RERUN_FAILED])

    def test_a_server_error_on_rerun_failed_jobs_is_never_repeated(self):
        def broken(_api):
            raise urllib.error.HTTPError(LIVE, 502, 'Bad Gateway', {}, io.BytesIO())

        api = FakeGitHub(rerun_failed=broken)
        with self.assertRaises(urllib.error.HTTPError):
            self.monitor(api)
        self.assertEqual(api.writes, [CANCEL, RERUN_FAILED])

    def test_monitor_polls_fast_while_the_mac_may_still_queue_and_slowly_afterwards(self):
        waits = []

        class Api(FakeGitHub):
            def __call__(self, method, path):
                if method == 'GET' and path.startswith(f'{LIVE}/attempts'):
                    self.jobs = [{**QUEUED, 'status': 'in_progress'}] if waits else [QUEUED]
                    if len(waits) == 1:
                        self.run.update(status='completed', conclusion='success')
                return super().__call__(method, path)

        fallback.monitor(Api(), event_for(), lambda: START + 10, waits.append, lambda _: None)
        self.assertEqual(waits, [fallback.FAST_POLL_SECONDS, fallback.POLL_SECONDS])

    def test_monitor_ends_as_soon_as_the_triage_asked_for_no_unit_lane(self):
        waits = []
        now = [START + 5]

        class Api(FakeGitHub):
            def __call__(self, method, path):
                if method == 'GET' and path.startswith(f'{LIVE}/attempts'):
                    self.jobs = [triage()] if waits else []
                return super().__call__(method, path)

        def sleep(seconds):
            waits.append(seconds)
            now[0] = START + 30

        api = Api()
        self.assertFalse(fallback.monitor(api, event_for(), lambda: now[0], sleep, lambda _: None))
        # One look before the triage ended, one after: no polling until the end of the run.
        self.assertEqual(waits, [fallback.FAST_POLL_SECONDS])
        self.assertEqual(api.calls.count(('GET', JOBS)), 2)


if __name__ == '__main__':
    unittest.main()
