import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testRunsService } from '../services/testRuns';
import { cleanupDuplicateExecutions } from '../utils/cleanupDuplicateExecutions';
import { migrateSkipToNotRun } from '../utils/migrateSkipToNotRun';
import { colors } from '../config/colors';

const AdminCleanup = () => {
  const navigate = useNavigate();
  const [cleaning, setCleaning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState<Array<{
    testRunId: string;
    totalExecutions: number;
    duplicatesDeleted: number;
    uniqueRemaining: number;
  }>>([]);
  const [migrationResult, setMigrationResult] = useState<{
    totalFound: number;
    migratedToNotRun: number;
    keptAsSkip: number;
  } | null>(null);
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

  const handleMigrateSkipToNotRun = async () => {
    if (!window.confirm('This will update all "Skip" status test case executions with no actual result to "Not Run" status. Continue?')) {
      return;
    }

    try {
      setMigrating(true);
      setError(null);
      setMigrationResult(null);

      const result = await migrateSkipToNotRun();
      setMigrationResult(result);
    } catch (err) {
      console.error('Error during migration:', err);
      setError('Failed to migrate Skip to Not Run. Please check the console for details.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Admin: Database Cleanup
          </h1>

          <div className="mb-6 space-y-6">
            <div className="border border-slate-200 rounded-lg p-4">
              <h2 className="text-lg font-medium text-slate-900 mb-2">
                1. Migrate Skip to Not Run
              </h2>
              <div className="mb-3 p-3 rounded bg-blue-50 border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Info:</p>
                <p className="text-sm text-blue-700">
                  This will update all Skip status executions that have no actual result to Not Run status.
                  Executions with Skip status that DO have an actual result will remain as Skip.
                </p>
              </div>
              <button
                onClick={handleMigrateSkipToNotRun}
                disabled={migrating || cleaning}
                className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.success.bg} hover:${colors.success.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.success.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {migrating ? 'Migrating...' : 'Migrate Skip to Not Run'}
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg p-4">
              <h2 className="text-lg font-medium text-slate-900 mb-2">
                2. Clean Up Duplicate Executions
              </h2>
              <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800">Warning:</p>
                <p className="text-sm text-amber-700">
                  This tool will remove duplicate test case executions from your database.
                  Only one execution per test case will be kept (the one with the lowest order number).
                </p>
              </div>
              <button
                onClick={handleCleanupAll}
                disabled={cleaning || migrating}
                className={`px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {cleaning ? 'Cleaning up...' : 'Clean Up All Duplicates'}
              </button>
            </div>
          </div>

          {error && (
            <div className={`mb-4 ${colors.danger.bgLight} border ${colors.danger.border} ${colors.danger.textDark} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          <div className="mb-6">
            <button
              onClick={() => navigate('/test-runs')}
              className="px-6 py-3 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
            >
              Back to Test Runs
            </button>
          </div>

          {migrationResult && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-slate-900 mb-3">
                Migration Results
              </h2>

              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="font-medium text-green-800">
                  Successfully migrated {migrationResult.migratedToNotRun} executions from Skip to Not Run!
                </p>
              </div>

              <div className="bg-slate-50 rounded p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Skip executions found:</span>
                  <span className="font-medium text-slate-900">{migrationResult.totalFound}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Migrated to Not Run (empty result):</span>
                  <span className="font-medium text-green-600">{migrationResult.migratedToNotRun}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Kept as Skip (has actual result):</span>
                  <span className="font-medium text-blue-600">{migrationResult.keptAsSkip}</span>
                </div>
              </div>
            </div>
          )}

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
