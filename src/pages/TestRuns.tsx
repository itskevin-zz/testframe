import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { TestRun } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCaseExecutionsService } from '../services/testCaseExecutions';

const TestRuns = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Map<string, { total: number; passed: number; failed: number; blocked: number; skipped: number }>>(new Map());

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getStatusBadge = (status: TestRun['status']) => {
    const styles = {
      'Not Started': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
    };
    return styles[status] || styles['Not Started'];
  };

  const calculateProgress = (runId: string) => {
    const runStats = stats.get(runId);
    if (!runStats || runStats.total === 0) return 0;
    return Math.round(((runStats.passed + runStats.failed + runStats.blocked + runStats.skipped) / runStats.total) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <button onClick={() => navigate('/dashboard')} className="focus:outline-none"><img src="/logo.png" alt="TestFrame" className="h-10" /></button>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/test-cases')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600"
                >
                  Test Runs
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
              <h2 className="text-2xl font-bold text-gray-900">Test Runs</h2>
              <p className="mt-1 text-sm text-gray-600">
                Manage test runs for releases and feature sets
              </p>
            </div>
            <button
              onClick={() => navigate('/test-runs/new')}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Test Run
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-gray-500">Loading test runs...</p>
              </div>
            </div>
          ) : testRuns.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">No test runs</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new test run.</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/test-runs/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Test Run
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {testRuns.map(run => {
                  const runStats = stats.get(run.id);
                  const progress = calculateProgress(run.id);

                  return (
                    <li key={run.id}>
                      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {run.name}
                              </h3>
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(run.status)}`}>
                                {run.status}
                              </span>
                            </div>
                            {run.description && (
                              <p className="mt-1 text-sm text-gray-500">{run.description}</p>
                            )}
                            <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                              <span>ID: {run.id}</span>
                              <span>Created by: {run.createdBy}</span>
                              <span>Created: {run.createdAt.toLocaleDateString()}</span>
                            </div>
                            {runStats && runStats.total > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-gray-600">Progress: {progress}%</span>
                                  <span className="text-gray-600">
                                    {runStats.passed + runStats.failed + runStats.blocked + runStats.skipped} / {runStats.total}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <div className="mt-2 flex space-x-4 text-xs">
                                  <span className="text-green-600">Pass: {runStats.passed}</span>
                                  <span className="text-red-600">Fail: {runStats.failed}</span>
                                  <span className="text-yellow-600">Blocked: {runStats.blocked}</span>
                                  <span className="text-gray-600">Skip: {runStats.skipped}</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0 flex space-x-2">
                            <button
                              onClick={() => navigate(`/test-runs/${run.id}/execute`)}
                              className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Execute Tests
                            </button>
                            <button
                              onClick={() => navigate(`/test-runs/${run.id}/edit`)}
                              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(run.id)}
                              className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
