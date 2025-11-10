import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testRunsService } from '../services/testRuns';
import { cleanupDuplicateExecutions } from '../utils/cleanupDuplicateExecutions';
import { colors } from '../config/colors';

const AdminCleanup = () => {
  const navigate = useNavigate();
  const [cleaning, setCleaning] = useState(false);
  const [results, setResults] = useState<Array<{
    testRunId: string;
    totalExecutions: number;
    duplicatesDeleted: number;
    uniqueRemaining: number;
  }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleCleanupAll = async () => {
    if (!window.confirm('This will remove all duplicate test case executions across all test runs. Continue?')) {
      return;
    }

    try {
      setCleaning(true);
      setError(null);
      setResults([]);

      // Get all test runs
      const testRuns = await testRunsService.getAll();

      const cleanupResults = [];

      // Clean up each test run
      for (const testRun of testRuns) {
        const result = await cleanupDuplicateExecutions(testRun.id);

        if (result.duplicatesDeleted > 0) {
          cleanupResults.push({
            testRunId: testRun.id,
            ...result
          });
        }
      }

      setResults(cleanupResults);
    } catch (err) {
      console.error('Error during cleanup:', err);
      setError('Failed to clean up duplicates. Please check the console for details.');
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Admin: Database Cleanup
          </h1>

          <div className="mb-4 p-4 rounded bg-amber-50 border border-amber-200">
            <p className="text-sm font-medium text-amber-800">Warning:</p>
            <p className="text-sm text-amber-700">
              This tool will remove duplicate test case executions from your database.
              Only one execution per test case will be kept (the one with the lowest order number).
            </p>
          </div>

          {error && (
            <div className={`mb-4 ${colors.danger.bgLight} border ${colors.danger.border} ${colors.danger.textDark} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={handleCleanupAll}
              disabled={cleaning}
              className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {cleaning ? 'Cleaning up...' : 'Clean Up All Duplicates'}
            </button>

            <button
              onClick={() => navigate('/test-runs')}
              className="ml-3 px-6 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              Back to Test Runs
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-slate-900 mb-3">
                Cleanup Results
              </h2>

              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="font-medium text-green-800">
                  Successfully cleaned up {results.reduce((sum, r) => sum + r.duplicatesDeleted, 0)} duplicate executions!
                </p>
              </div>

              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Test Run
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Executions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Duplicates Deleted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Unique Remaining
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {results.map((result) => (
                    <tr key={result.testRunId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {result.testRunId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {result.totalExecutions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-600 font-medium">
                        {result.duplicatesDeleted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {result.uniqueRemaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCleanup;
