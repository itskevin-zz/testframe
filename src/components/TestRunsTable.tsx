import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TestRun } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCaseExecutionsService } from '../services/testCaseExecutions';
import { colors, colorHelpers } from '../config/colors';

interface TestRunWithStats extends TestRun {
  totalTests: number;
  passedTests: number;
  passRate: number;
}

const TestRunsTable = () => {
  const navigate = useNavigate();
  const [testRuns, setTestRuns] = useState<TestRunWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTestRuns();
  }, []);

  const loadTestRuns = async () => {
    try {
      setLoading(true);
      const runs = await testRunsService.getAll();

      // Calculate stats for each test run
      const runsWithStats = await Promise.all(
        runs.map(async (run) => {
          const executions = await testCaseExecutionsService.getByTestRunId(run.id);
          const executedTests = executions.filter(e => e.actualResult);
          const passedTests = executedTests.filter(e => e.status === 'Pass');
          const passRate = executedTests.length > 0
            ? Math.round((passedTests.length / executedTests.length) * 100)
            : 0;

          return {
            ...run,
            totalTests: executedTests.length,
            passedTests: passedTests.length,
            passRate,
          };
        })
      );

      setTestRuns(runsWithStats);
    } catch (err) {
      console.error('Error loading test runs:', err);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className={`h-4 ${colors.secondary.skeleton} rounded w-1/4 mb-4`}></div>
          <div className="space-y-3">
            <div className={`h-8 ${colors.secondary.skeleton} rounded`}></div>
            <div className={`h-8 ${colors.secondary.skeleton} rounded`}></div>
            <div className={`h-8 ${colors.secondary.skeleton} rounded`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (testRuns.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Recent Test Runs</h3>
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-slate-900">No test runs</h3>
          <p className="mt-1 text-sm text-slate-500">
            Get started by creating a new test run.
          </p>
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
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-medium text-slate-900">Recent Test Runs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Created By
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Created At
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                Pass Rate
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {testRuns.map((run) => (
              <tr
                key={run.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => navigate(`/test-runs/${run.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                  {run.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{run.name}</div>
                  {run.description && (
                    <div className="text-sm text-slate-500 truncate max-w-xs">
                      {run.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {run.createdBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {formatDate(run.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorHelpers.getStatusBadge(run.status).bg} ${colorHelpers.getStatusBadge(run.status).text}`}
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {run.totalTests > 0 ? (
                    <div className="text-sm">
                      <span className={`font-semibold ${colorHelpers.getPassRateColor(run.passRate)}`}>
                        {run.passRate}%
                      </span>
                      <span className="text-slate-500 ml-1">
                        ({run.passedTests}/{run.totalTests})
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">No tests executed</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/test-runs/${run.id}`);
                    }}
                    className="text-stone-500 hover:text-stone-700"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestRunsTable;
