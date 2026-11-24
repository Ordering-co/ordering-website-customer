"""Safety checks for retiring only idle runners owned by this pilot."""
import subprocess
import unittest
from unittest.mock import patch
import supervisor


class RunnerRetirementTests(unittest.TestCase):
    def setUp(self):
        self.label = 'website-theming-ci'
        self.name = f'{self.label}-1-test'

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_busy_runner_is_preserved(self, api, execute):
        api.return_value = {'busy': True, 'name': self.name}
        self.assertFalse(supervisor.remove_idle_runner('org/repo', 42, self.name, self.label))
        execute.assert_not_called()

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_another_runner_is_preserved(self, api, execute):
        api.return_value = {'busy': False, 'name': 'another-session'}
        with self.assertRaises(RuntimeError):
            supervisor.remove_idle_runner('org/repo', 42, self.name, self.label)
        execute.assert_not_called()

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_another_pool_label_is_preserved(self, api, execute):
        api.return_value = {'busy': False, 'name': self.name}
        with self.assertRaises(RuntimeError):
            supervisor.remove_idle_runner('org/repo', 42, self.name, 'dashboard-pool')
        execute.assert_not_called()

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_finished_jit_runner_needs_no_deletion(self, api, execute):
        api.side_effect = subprocess.CalledProcessError(1, ['gh'], stderr='HTTP 404')
        self.assertTrue(supervisor.remove_idle_runner('org/repo', 42, self.name, self.label))
        execute.assert_not_called()

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_idle_owned_runner_is_retired_by_exact_id(self, api, execute):
        api.return_value = {'busy': False, 'name': self.name}
        self.assertTrue(supervisor.remove_idle_runner('org/repo', 42, self.name, self.label))
        execute.assert_called_once_with([
            'gh', 'api', '--method', 'DELETE', 'repos/org/repo/actions/runners/42'
        ])

    @patch('supervisor.execute')
    @patch('supervisor.api')
    def test_permission_error_is_not_treated_as_missing(self, api, execute):
        api.side_effect = subprocess.CalledProcessError(1, ['gh'], stderr='HTTP 403')
        with self.assertRaises(subprocess.CalledProcessError):
            supervisor.remove_idle_runner('org/repo', 42, self.name, self.label)
        execute.assert_not_called()


class ContainerInspectionTests(unittest.TestCase):
    @patch('supervisor.subprocess.run')
    def test_discarded_container_is_missing_regardless_of_docker_case(self, run):
        for message in ['error: no such object: ci', 'Error: No such object: ci',
                        'Error response from daemon: No such container: ci']:
            with self.subTest(message=message):
                run.return_value = subprocess.CompletedProcess([], 1, '[]', message)
                self.assertIsNone(supervisor.inspect_container(['docker'], 'ci'))

    @patch('supervisor.subprocess.run')
    def test_daemon_failure_is_not_treated_as_discarded_container(self, run):
        run.return_value = subprocess.CompletedProcess([], 1, '', 'Cannot connect to daemon')
        with self.assertRaises(RuntimeError):
            supervisor.inspect_container(['docker'], 'ci')



if __name__ == '__main__':
    unittest.main()
