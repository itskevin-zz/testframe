import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { TestRun, TestCase, TestCaseExecution } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCasesService } from '../services/testCases';
import { testCaseExecutionsService } from '../services/testCaseExecutions';

interface TestCaseWithExecution extends TestCase {
  execution?: TestCaseExecution;
}

const TestRunDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [testCases, setTestCases] = useState<TestCaseWithExecution[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    status: 'Pass' | 'Fail' | 'Blocked' | 'Skip';
    actualResult: string;
    notes: string;
  }>({
    status: 'Skip',
    actualResult: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadTestRunDetails();
    }
  }, [id]);

  useEffect(() => {
    // Load execution data when selected test case changes
    if (selectedTestCaseId) {
      const selectedCase = testCases.find(tc => tc.id === selectedTestCaseId);
      if (selectedCase?.execution) {
        setFormData({
          status: selectedCase.execution.status,
          actualResult: selectedCase.execution.actualResult,
          notes: selectedCase.execution.notes || '',
        });
      } else {
        setFormData({
          status: 'Skip',
          actualResult: '',
          notes: '',
        });
      }
    }
  }, [selectedTestCaseId, testCases]);

  const loadTestRunDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load test run
      const run = await testRunsService.getById(id!);
      if (!run) {
        setError('Test run not found');
        return;
      }
      setTestRun(run);

      // Load all test cases and their executions for this test run
      const executions = await testCaseExecutionsService.getByTestRunId(id!);
      const allTestCases = await testCasesService.getAll();

      // Create a map of test case IDs to their executions
      const executionMap = new Map(executions.map(e => [e.testCaseId, e]));

      // Filter test cases that are part of this test run and attach their execution data
      const testCasesWithExecution = allTestCases
        .filter(tc => executionMap.has(tc.id))
        .map(tc => ({
          ...tc,
          execution: executionMap.get(tc.id),
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

      setTestCases(testCasesWithExecution);
      if (testCasesWithExecution.length > 0) {
        setSelectedTestCaseId(testCasesWithExecution[0].id);
      }
    } catch (err) {
      console.error('Error loading test run details:', err);
      setError('Failed to load test run details');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleSubmit = async () => {
    if (!selectedTestCaseId || !id) return;

    try {
      setSubmitting(true);
      const selectedCase = testCases.find(tc => tc.id === selectedTestCaseId);

      if (selectedCase?.execution) {
        // Update existing execution
        await testCaseExecutionsService.update(selectedCase.execution.id, {
          status: formData.status,
          actualResult: formData.actualResult,
          notes: formData.notes,
          testedBy: user?.email || '',
        });
      }

      // Get current index before reloading
      const currentIndex = testCases.findIndex(tc => tc.id === selectedTestCaseId);

      // Reload test cases to update sidebar
      await loadTestRunDetails();

      // Move to next test case if available
      if (currentIndex < testCases.length - 1) {
        setSelectedTestCaseId(testCases[currentIndex + 1].id);
      }
    } catch (err) {
      console.error('Error submitting test execution:', err);
      setError('Failed to submit test result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (!selectedTestCaseId) return;

    const currentIndex = testCases.findIndex(tc => tc.id === selectedTestCaseId);
    if (currentIndex < testCases.length - 1) {
      setSelectedTestCaseId(testCases[currentIndex + 1].id);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Pass':
        return 'bg-green-100 text-green-800';
      case 'Fail':
        return 'bg-red-100 text-red-800';
      case 'Blocked':
        return 'bg-yellow-100 text-yellow-800';
      case 'Skip':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-xl font-bold text-gray-900">TestFrame</h1>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading test run details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !testRun) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <h1 className="text-xl font-bold text-gray-900">TestFrame</h1>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Test run not found'}
          </div>
          <button
            onClick={() => navigate('/test-runs')}
            className="mt-4 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Test Runs
          </button>
        </main>
      </div>
    );
  }

  const selectedTestCase = testCases.find(tc => tc.id === selectedTestCaseId);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">TestFrame</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600"
                >
                  Test Runs
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/test-runs')}
              className="text-blue-600 hover:text-blue-900 text-sm font-medium mb-4"
            >
              ← Back to Test Runs
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{testRun.name}</h1>
              <p className="mt-2 text-sm text-gray-600">{testRun.description}</p>
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                <span>ID: {testRun.id}</span>
                <span>Created by: {testRun.createdBy}</span>
                <span>Created: {testRun.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Main content with sidebar */}
          <div className="flex gap-6">
            {/* Sidebar - Test Cases List */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Test Cases ({testCases.length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {testCases.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">No test cases in this run</p>
                    </div>
                  ) : (
                    testCases.map((testCase) => (
                      <button
                        key={testCase.id}
                        onClick={() => setSelectedTestCaseId(testCase.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors ${
                          selectedTestCaseId === testCase.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {testCase.id}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {testCase.feature}
                            </p>
                          </div>
                          {testCase.execution && (
                            <span
                              className={`flex-shrink-0 ml-2 px-2 py-1 text-xs leading-4 font-semibold rounded ${getStatusBadgeColor(
                                testCase.execution.status
                              )}`}
                            >
                              {testCase.execution.status}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1">
              {selectedTestCase ? (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {selectedTestCase.feature}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        {selectedTestCase.component}
                      </span>
                      <span className="text-sm text-gray-600">
                        Test Type: {selectedTestCase.testType}
                      </span>
                      <span className="text-sm text-gray-600">
                        Priority: {selectedTestCase.priority}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Test Details */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Preconditions</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedTestCase.preconditions}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Test Steps</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedTestCase.testSteps}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Expected Result</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedTestCase.expectedResult}
                        </p>
                      </div>
                    </div>

                    {/* Execution Form */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Execution</h3>

                      {/* Status */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) =>
                            setFormData(prev => ({
                              ...prev,
                              status: e.target.value as 'Pass' | 'Fail' | 'Blocked' | 'Skip',
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="Skip">Skip</option>
                          <option value="Pass">Pass</option>
                          <option value="Fail">Fail</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>

                      {/* Actual Result */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Actual Result
                        </label>
                        <textarea
                          value={formData.actualResult}
                          onChange={(e) =>
                            setFormData(prev => ({
                              ...prev,
                              actualResult: e.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Enter the actual result (supports markdown)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData(prev => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          rows={3}
                          placeholder="Additional notes (supports markdown)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      {/* Tested By and Date */}
                      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tested By
                          </label>
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Execution Date
                          </label>
                          <input
                            type="text"
                            value={new Date().toLocaleString()}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={handleNext}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Next
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? 'Submitting...' : 'Submit & Next'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow rounded-lg p-6 text-center">
                  <p className="text-gray-500">Select a test case to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TestRunDetails;
