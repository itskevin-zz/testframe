import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TestCase, TestCaseExecution } from '../types/testCase';
import { testCasesService } from '../services/testCases';
import { testCaseExecutionsService } from '../services/testCaseExecutions';

const TestCases = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [selectedTestCaseExecutions, setSelectedTestCaseExecutions] = useState<TestCaseExecution[]>([]);
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const cases = await testCasesService.getAll();
      setTestCases(cases);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load test cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTestCase) {
      loadTestCaseExecutions(selectedTestCase.id);
    }
  }, [selectedTestCase]);

  const loadTestCaseExecutions = async (testCaseId: string) => {
    try {
      const executions = await testCaseExecutionsService.getByTestCaseId(testCaseId);
      setSelectedTestCaseExecutions(executions);
    } catch (err) {
      console.error('Error loading test case executions:', err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };


  const filteredTestCases = testCases.filter(tc => {
    if (filterComponent !== 'all' && tc.component !== filterComponent) return false;
    if (filterPriority !== 'all' && tc.priority !== filterPriority) return false;
    return true;
  });

  const uniqueComponents = Array.from(new Set(testCases.map(tc => tc.component)));

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="focus:outline-none"
              >
                <img src="/logo.png" alt="TestFrame" className="h-10" />
              </button>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/test-cases')}
                  className="text-slate-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-stone-500"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-rose-400 hover:bg-rose-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-300"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Test Cases</h2>
            <button
              onClick={() => navigate('/test-cases/new')}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-stone-500 hover:bg-stone-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Test Case
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="filter-component" className="block text-sm font-medium text-slate-700">
                    Component
                  </label>
                  <select
                    id="filter-component"
                    value={filterComponent}
                    onChange={(e) => setFilterComponent(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Components</option>
                    {uniqueComponents.map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filter-priority" className="block text-sm font-medium text-slate-700">
                    Priority
                  </label>
                  <select
                    id="filter-priority"
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm rounded-md"
                  >
                    <option value="all">All Priorities</option>
                    <option value="P0">P0</option>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden rounded-lg">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Loading test cases...</p>
              </div>
            ) : filteredTestCases.length === 0 ? (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-slate-900">No test cases</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by creating a new test case.</p>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/test-cases/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-stone-500 hover:bg-stone-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500"
                  >
                    Create Test Case
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Test ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Component
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Feature
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Last Run
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredTestCases.map((testCase) => (
                        <tr
                          key={testCase.id}
                          onClick={() => setSelectedTestCase(testCase)}
                          className="hover:bg-slate-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-600">
                            {testCase.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {testCase.component}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {testCase.feature}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {testCase.testType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              testCase.priority === 'P0' ? 'bg-rose-100 text-rose-800' :
                              testCase.priority === 'P1' ? 'bg-orange-100 text-orange-800' :
                              testCase.priority === 'P2' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {testCase.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            <span className="text-slate-400">View details for status</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/test-cases/${testCase.id}/edit`);
                              }}
                              className="text-stone-600 hover:text-stone-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/test-cases/${testCase.id}/run`);
                              }}
                              className="text-emerald-600 hover:text-emerald-900"
                            >
                              Run
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedTestCase && (
        <div className="fixed inset-0 bg-slate-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-slate-900">{selectedTestCase.id}</h3>
                <button
                  onClick={() => setSelectedTestCase(null)}
                  className="text-slate-400 hover:text-slate-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500">Component</h4>
                <p className="mt-1 text-sm text-slate-900">{selectedTestCase.component}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Feature</h4>
                <p className="mt-1 text-sm text-slate-900">{selectedTestCase.feature}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500">Test Type</h4>
                  <p className="mt-1 text-sm text-slate-900">{selectedTestCase.testType}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500">Priority</h4>
                  <p className="mt-1 text-sm text-slate-900">{selectedTestCase.priority}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Preconditions</h4>
                <div className="mt-1 text-sm text-slate-900 prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTestCase.preconditions}</ReactMarkdown>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Test Steps</h4>
                <div className="mt-1 text-sm text-slate-900 prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTestCase.testSteps}</ReactMarkdown>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Expected Result</h4>
                <div className="mt-1 text-sm text-slate-900 prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedTestCase.expectedResult}</ReactMarkdown>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500">Execution History</h4>
                <div className="mt-2">
                  {selectedTestCaseExecutions.length === 0 ? (
                    <p className="text-sm text-slate-500">No executions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTestCaseExecutions.map(execution => (
                          <div key={execution.id} className="border border-slate-200 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    execution.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                                    execution.status === 'Fail' ? 'bg-rose-100 text-rose-800' :
                                    execution.status === 'Blocked' ? 'bg-slate-100 text-slate-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {execution.status}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {execution.executionDate.toLocaleString()}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-600">By: {execution.testedBy}</p>
                                {execution.actualResult && (
                                  <div className="mt-1 text-sm text-slate-900 prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{execution.actualResult}</ReactMarkdown>
                                  </div>
                                )}
                                {execution.notes && (
                                  <div className="mt-1 text-sm text-slate-600 italic prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{execution.notes}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setSelectedTestCase(null)}
                className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-white bg-rose-400 hover:bg-rose-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCases;
