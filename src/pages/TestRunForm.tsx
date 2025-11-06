import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TestCase, TestRun, TestStatus } from '../types/testCase';
import { testCasesService } from '../services/testCases';
import { testRunsService } from '../services/testRuns';

const TestRunForm = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // Test Case ID
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [formData, setFormData] = useState<Omit<TestRun, 'id' | 'testCaseId' | 'testedBy' | 'testRunDate'>>({
    actualResult: '',
    status: 'Pass',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTestCase();
  }, [id]);

  const loadTestCase = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const testCase = await testCasesService.getById(id);
      if (testCase) {
        setTestCase(testCase);
      } else {
        setError('Test case not found');
      }
    } catch (err) {
      console.error('Error loading test case:', err);
      setError('Failed to load test case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !testCase) return;

    try {
      setSaving(true);
      setError(null);

      await testRunsService.create({
        testCaseId: testCase.id,
        ...formData,
        testedBy: user.email || '',
        testRunDate: new Date(),
      });

      navigate('/test-cases');
    } catch (err) {
      console.error('Error saving test run:', err);
      setError('Failed to save test run. Please try again.');
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

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
                  onClick={() => navigate('/test-cases')}
                  className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600"
                >
                  Test Cases
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

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Record Test Run</h2>
            {testCase && <p className="mt-1 text-sm text-gray-600">Test Case: {testCase.id}</p>}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-gray-500">Loading test case...</p>
              </div>
            </div>
          ) : !testCase ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-red-500">Test case not found</p>
                <button
                  onClick={() => navigate('/test-cases')}
                  className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Back to Test Cases
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Case Details</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Component</h4>
                  <p className="mt-1 text-sm text-gray-900">{testCase.component}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Feature</h4>
                  <p className="mt-1 text-sm text-gray-900">{testCase.feature}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Test Type</h4>
                    <p className="mt-1 text-sm text-gray-900">{testCase.testType}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Priority</h4>
                    <span className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      testCase.priority === 'P0' ? 'bg-red-100 text-red-800' :
                      testCase.priority === 'P1' ? 'bg-orange-100 text-orange-800' :
                      testCase.priority === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {testCase.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Preconditions</h4>
                  <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{testCase.preconditions}</ReactMarkdown>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Test Steps</h4>
                  <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{testCase.testSteps}</ReactMarkdown>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Expected Result</h4>
                  <div className="mt-1 text-sm text-gray-900 prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{testCase.expectedResult}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

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
                      placeholder="- Validation **passed** ✓&#10;- SMS received in `25 seconds`&#10;- User created with status: `active`&#10;- ❌ Email field was `null` (BUG)"
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
                      placeholder="Additional observations, links to issues, etc.&#10;- See [bug #123](https://github.com/...)&#10;- **Note**: Flaky on Chrome"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Markdown formatting available
                    </p>
                  </div>

                  <div className="bg-gray-50 -mx-6 -mb-5 px-6 py-4 rounded-b-lg">
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Tested By:</span> {user?.email}</p>
                      <p><span className="font-medium">Test Run Date:</span> {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-100 text-right space-x-3 rounded-b-lg border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate('/test-cases')}
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Submitting...' : 'Submit Test Run'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestRunForm;
