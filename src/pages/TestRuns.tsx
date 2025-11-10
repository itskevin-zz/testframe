import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { TestRun } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCaseExecutionsService } from '../services/testCaseExecutions';
import { colors, colorHelpers } from '../config/colors';

const TestRuns = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Map<string, { total: number; passed: number; failed: number; blocked: number; skipped: number; notRun: number }>>(new Map());

  useEffect(() => {
    loadTestRuns();
  }, []);

  const loadTestRuns = async () => {
    try {
      setLoading(true);
      setError(null);
      const runs = await testRunsService.getAll();
      setTestRuns(runs);

      // Load stats for each test run
      const statsMap = new Map();
      for (const run of runs) {
        const runStats = await testCaseExecutionsService.getTestRunStats(run.id);
        statsMap.set(run.id, runStats);
      }
      setStats(statsMap);
    } catch (err) {
      console.error('Error loading test runs:', err);
      setError('Failed to load test runs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test run? This will also delete all associated test executions.')) {
      return;
    }

    try {
      await testRunsService.delete(id);
      setTestRuns(prev => prev.filter(tr => tr.id !== id));
    } catch (err) {
      console.error('Error deleting test run:', err);
      setError('Failed to delete test run. Please try again.');
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user?.email) {
      setError('User not authenticated');
      return;
    }

    try {
      // Duplicate the test run
      const newTestRunId = await testRunsService.duplicate(id, user.email);

      // Get the original test case executions
      const originalExecutions = await testCaseExecutionsService.getByTestRunId(id);

      // Create new executions for the duplicated test run with "Not Run" status
      for (const execution of originalExecutions) {
        await testCaseExecutionsService.create({
          testRunId: newTestRunId,
          testCaseId: execution.testCaseId,
          actualResult: '',
          status: 'Not Run',
          testedBy: '',
          executionDate: new Date(),
          notes: '',
          order: execution.order,
        });
      }

      // Reload the test runs to show the new one
      await loadTestRuns();

      // Navigate to the new test run
      navigate(`/test-runs/${newTestRunId}`);
    } catch (err) {
      console.error('Error duplicating test run:', err);
      setError('Failed to duplicate test run. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };


  const calculateProgress = (runId: string) => {
    const runStats = stats.get(runId);
    if (!runStats || runStats.total === 0) return 0;
    return Math.round(((runStats.passed + runStats.failed + runStats.blocked + runStats.skipped) / runStats.total) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <button onClick={() => navigate('/dashboard')} className="focus:outline-none"><img src="/logo.png" alt="TestFrame" className="h-10" /></button>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/test-cases')}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-slate-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-stone-400"
                >
                  Test Runs
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.danger.bg} hover:${colors.danger.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-300`}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Test Runs</h2>
              <p className="mt-1 text-sm text-slate-600">
                Manage test runs for releases and feature sets
              </p>
            </div>
            <button
              onClick={() => navigate('/test-runs/new')}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring}`}
            >
              Create Test Run
            </button>
          </div>

          {error && (
            <div className={`mb-4 ${colors.danger.bgLight} ${colors.danger.border} border ${colors.danger.textDark} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-slate-500">Loading test runs...</p>
              </div>
            </div>
          ) : testRuns.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No test runs</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by creating a new test run.</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/test-runs/new')}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring}`}
                  >
                    Create Test Run
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-slate-200">
                {testRuns.map(run => {
                  const runStats = stats.get(run.id);
                  const progress = calculateProgress(run.id);

                  return (
                    <li key={run.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-slate-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-slate-900 truncate">
                                {run.name}
                              </h3>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorHelpers.getStatusBadge(run.status).bg} ${colorHelpers.getStatusBadge(run.status).text}`}>
                                {run.status}
                              </span>
                            </div>
                            {run.description && (
                              <p className="mt-1 text-sm text-slate-500">{run.description}</p>
                            )}
                            <div className="mt-2 flex items-center text-sm text-slate-500 space-x-4">
                              <span>ID: {run.id}</span>
                              <span>Created by: {run.createdBy}</span>
                              <span>Created: {run.createdAt.toLocaleDateString()}</span>
                            </div>
                            {runStats && runStats.total > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-slate-600">Progress: {progress}%</span>
                                  <span className="text-slate-600">
                                    {runStats.passed + runStats.failed + runStats.blocked + runStats.skipped} / {runStats.total}
                                  </span>
                                </div>
                                <div className={`w-full ${colors.progress.bg} rounded-full h-2`}>
                                  <div
                                    className={`${colors.progress.fill} h-2 rounded-full`}
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <div className="mt-2 flex space-x-4 text-xs">
                                  <span className={colors.testResults.pass.text}>Pass: {runStats.passed}</span>
                                  <span className={colors.testResults.fail.text}>Fail: {runStats.failed}</span>
                                  <span className={colors.testResults.blocked.text}>Blocked: {runStats.blocked}</span>
                                  <span className={colors.testResults.skip.text}>Skip: {runStats.skipped}</span>
                                  <span className={colors.testResults.notRun.text}>Not Run: {runStats.notRun}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0 flex space-x-2">
                            <button
                              onClick={() => navigate(`/test-runs/${run.id}`)}
                              className={`px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.success.bg} hover:${colors.success.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.success.ring}`}
                            >
                              Execute Tests
                            </button>
                            <button
                              onClick={() => handleDuplicate(run.id)}
                              className={`px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring}`}
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => navigate(`/test-runs/${run.id}/edit`)}
                              className="px-3 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-400"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(run.id)}
                              className={`px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.danger.bg} hover:${colors.danger.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-300`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestRuns;
