import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TestRun, TestCase, TestCaseExecution, TestStatus } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCasesService } from '../services/testCases';
import { testCaseExecutionsService } from '../services/testCaseExecutions';

const TestRunExecution = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // Test Run ID
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [executions, setExecutions] = useState<TestCaseExecution[]>([]);
  const [testCases, setTestCases] = useState<Map<string, TestCase>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    actualResult: '',
    status: 'Pass' as TestStatus,
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTestRunData();
  }, [id]);

  const loadTestRunData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Load test run
      const run = await testRunsService.getById(id);
      if (!run) {
        setError('Test run not found');
        return;
      }
      setTestRun(run);

      // Load executions
      const execs = await testCaseExecutionsService.getByTestRunId(id);
      setExecutions(execs);

      // Load all test cases for this run
      const testCaseMap = new Map<string, TestCase>();
      for (const exec of execs) {
        const testCase = await testCasesService.getById(exec.testCaseId);
        if (testCase) {
          testCaseMap.set(testCase.id, testCase);
        }
      }
      setTestCases(testCaseMap);

      // Find first untested case or start at beginning
      const firstUntestedIndex = execs.findIndex(e => !e.actualResult);
      setCurrentIndex(firstUntestedIndex >= 0 ? firstUntestedIndex : 0);
    } catch (err) {
      console.error('Error loading test run data:', err);
      setError('Failed to load test run data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const currentExecution = executions[currentIndex];
    if (!currentExecution) return;

    try {
      setSaving(true);
      setError(null);

      await testCaseExecutionsService.update(currentExecution.id, {
        actualResult: formData.actualResult,
        status: formData.status,
        testedBy: user.email || '',
        notes: formData.notes,
      });

      // Reload executions
      const updatedExecs = await testCaseExecutionsService.getByTestRunId(id!);
      setExecutions(updatedExecs);

      // Move to next test case
      if (currentIndex < executions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setFormData({
          actualResult: '',
          status: 'Pass',
          notes: '',
        });
      } else {
        // All tests completed
        await testRunsService.update(id!, { status: 'Completed' });
        navigate('/test-runs');
      }
    } catch (err) {
      console.error('Error saving test execution:', err);
      setError('Failed to save test execution. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < executions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setFormData({
        actualResult: '',
        status: 'Pass',
        notes: '',
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevExecution = executions[currentIndex - 1];
      setFormData({
        actualResult: prevExecution.actualResult,
        status: prevExecution.status,
        notes: prevExecution.notes || '',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const calculateProgress = () => {
    const tested = executions.filter(e => e.actualResult).length;
    return Math.round((tested / executions.length) * 100);
  };

  const getStats = () => {
    return {
      total: executions.length,
      tested: executions.filter(e => e.actualResult).length,
      passed: executions.filter(e => e.status === 'Pass' && e.actualResult).length,
      failed: executions.filter(e => e.status === 'Fail' && e.actualResult).length,
      blocked: executions.filter(e => e.status === 'Blocked' && e.actualResult).length,
      skipped: executions.filter(e => e.status === 'Skip' && e.actualResult).length,
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading test run...</p>
      </div>
    );
  }

  if (!testRun || executions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Test run not found or has no test cases</p>
          <button
            onClick={() => navigate('/test-runs')}
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Test Runs
          </button>
        </div>
      </div>
    );
  }

  const currentExecution = executions[currentIndex];
  const currentTestCase = currentExecution ? testCases.get(currentExecution.testCaseId) : null;
  const stats = getStats();
  const progress = calculateProgress();

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
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{testRun.name}</h2>
                {testRun.description && (
                  <p className="mt-1 text-sm text-gray-600">{testRun.description}</p>
                )}
              </div>
              <button
                onClick={() => navigate('/test-runs')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Exit Test Run
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">
                  Test Case {currentIndex + 1} of {executions.length}
                </span>
                <span className="text-gray-600">Progress: {progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="mt-2 flex space-x-4 text-xs">
                <span className="text-gray-600">Tested: {stats.tested}/{stats.total}</span>
                <span className="text-green-600">Pass: {stats.passed}</span>
                <span className="text-red-600">Fail: {stats.failed}</span>
                <span className="text-yellow-600">Blocked: {stats.blocked}</span>
                <span className="text-gray-600">Skip: {stats.skipped}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {currentTestCase ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Case Details */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Case Details</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Test Case ID</h4>
                    <p className="mt-1 text-sm text-gray-900">{currentTestCase.id}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Component</h4>
                    <p className="mt-1 text-sm text-gray-900">{currentTestCase.component}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Feature</h4>
                    <p className="mt-1 text-sm text-gray-900">{currentTestCase.feature}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Test Type</h4>
                      <p className="mt-1 text-sm text-gray-900">{currentTestCase.testType}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Priority</h4>
                      <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        currentTestCase.priority === 'P0' ? 'bg-red-100 text-red-800' :
                        currentTestCase.priority === 'P1' ? 'bg-orange-100 text-orange-800' :
                        currentTestCase.priority === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {currentTestCase.priority}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Preconditions</h4>
                    <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentTestCase.preconditions}</ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Test Steps</h4>
                    <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentTestCase.testSteps}</ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Expected Result</h4>
                    <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentTestCase.expectedResult}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Form */}
              <div>
                <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
                  <div className="px-6 py-5 space-y-6">
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status *
                      </label>
                      <select
                        id="status"
                        required
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value as TestStatus)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                      >
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Skip">Skip</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="actualResult" className="block text-sm font-medium text-gray-700">
                        Actual Result * <span className="text-gray-400 font-normal">(Markdown supported)</span>
                      </label>
                      <textarea
                        id="actualResult"
                        required
                        rows={8}
                        value={formData.actualResult}
                        onChange={(e) => handleChange('actualResult', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                        placeholder="- Validation **passed** ✓&#10;- SMS received in `25 seconds`&#10;- User created with status: `active`"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Use **bold** for status, `code` for values, ✓/❌ for pass/fail
                      </p>
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes (Optional) <span className="text-gray-400 font-normal">(Markdown supported)</span>
                      </label>
                      <textarea
                        id="notes"
                        rows={4}
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
                        placeholder="Additional observations, links to issues, etc."
                      />
                    </div>

                    <div className="bg-gray-50 -mx-6 -mb-5 px-6 py-4 rounded-b-lg">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Tested By:</span> {user?.email}</p>
                        <p><span className="font-medium">Execution Date:</span> {new Date().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gray-100 text-right space-x-3 rounded-b-lg border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0 || saving}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={currentIndex === executions.length - 1 || saving}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Saving...' : (currentIndex === executions.length - 1 ? 'Submit & Complete' : 'Submit & Next')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-red-500">Test case not found</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestRunExecution;
