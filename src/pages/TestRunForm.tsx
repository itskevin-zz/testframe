import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import type { TestRun, TestCase, TestRunTemplate } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCasesService } from '../services/testCases';
import { testRunTemplatesService } from '../services/testRunTemplates';
import { testCaseExecutionsService } from '../services/testCaseExecutions';

const TestRunForm = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState<Omit<TestRun, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>({
    name: '',
    description: '',
    status: 'Not Started',
  });
  const [templates, setTemplates] = useState<TestRunTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [isEdit, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load templates and test cases
      const [templatesList, testCasesList] = await Promise.all([
        testRunTemplatesService.getAll(),
        testCasesService.getAll(),
      ]);

      setTemplates(templatesList);
      setAllTestCases(testCasesList);

      // If editing, load the test run
      if (isEdit && id) {
        const testRun = await testRunsService.getById(id);
        if (testRun) {
          setFormData({
            name: testRun.name,
            description: testRun.description,
            status: testRun.status,
          });

          // Load associated test cases
          const executions = await testCaseExecutionsService.getByTestRunId(id);
          const testCaseIds = new Set(executions.map(e => e.testCaseId));
          setSelectedTestCases(testCaseIds);
        } else {
          setError('Test run not found');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTestCases(new Set(template.testCaseIds));
      }
    }
  };

  const handleTestCaseToggle = (testCaseId: string) => {
    setSelectedTestCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testCaseId)) {
        newSet.delete(testCaseId);
      } else {
        newSet.add(testCaseId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedTestCases(new Set(allTestCases.map(tc => tc.id)));
  };

  const handleDeselectAll = () => {
    setSelectedTestCases(new Set());
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (selectedTestCases.size === 0) {
      setError('Please select at least one test case');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEdit && id) {
        // Update existing test run
        await testRunsService.update(id, formData);

        // Update test case executions: remove deleted ones, add new ones
        const existingExecutions = await testCaseExecutionsService.getByTestRunId(id);
        const existingTestCaseIds = new Set(existingExecutions.map(e => e.testCaseId));

        // Delete removed test cases
        for (const execution of existingExecutions) {
          if (!selectedTestCases.has(execution.testCaseId)) {
            await testCaseExecutionsService.delete(execution.id);
          }
        }

        // Add new test cases
        for (const testCaseId of selectedTestCases) {
          if (!existingTestCaseIds.has(testCaseId)) {
            await testCaseExecutionsService.create({
              testRunId: id,
              testCaseId,
              actualResult: '',
              status: 'Skip',
              testedBy: '',
              executionDate: new Date(),
              notes: '',
            });
          }
        }
      } else {
        // Create new test run
        const testRunId = await testRunsService.generateTestRunId();
        const testRun: TestRun = {
          id: testRunId,
          ...formData,
          createdBy: user.email || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await testRunsService.create(testRun);

        // Create test case executions for all selected test cases
        for (const testCaseId of selectedTestCases) {
          await testCaseExecutionsService.create({
            testRunId: testRun.id,
            testCaseId,
            actualResult: '',
            status: 'Skip' as const,
            testedBy: '',
            executionDate: new Date(),
            notes: '',
          });
        }
      }

      navigate('/test-runs');
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
              <button
                onClick={() => navigate('/dashboard')}
                className="focus:outline-none"
              >
                <img src="/logo.png" alt="TestFrame" className="h-10" />
              </button>
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

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Test Run' : 'Create Test Run'}
            </h2>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-gray-500">Loading...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Run Details</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="e.g., Release 2.5.0, Sprint 10 Testing"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Optional description of this test run"
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status *
                    </label>
                    <select
                      id="status"
                      required
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value as TestRun['status'])}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Test Cases</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {!isEdit && templates.length > 0 && (
                  <div className="mb-4">
                    <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                      Load from Template
                    </label>
                    <select
                      id="template"
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                    >
                      <option value="">-- Select a template --</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.testCaseIds.length} test cases)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="text-sm text-gray-600 mb-3">
                  Selected: {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? 's' : ''}
                </div>

                {allTestCases.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No test cases available. Create test cases first.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Component
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Feature
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Priority
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {allTestCases.map(testCase => (
                          <tr
                            key={testCase.id}
                            className={selectedTestCases.has(testCase.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedTestCases.has(testCase.id)}
                                onChange={() => handleTestCaseToggle(testCase.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {testCase.id}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {testCase.component}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {testCase.feature}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                testCase.priority === 'P0' ? 'bg-red-100 text-red-800' :
                                testCase.priority === 'P1' ? 'bg-orange-100 text-orange-800' :
                                testCase.priority === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {testCase.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/test-runs')}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (isEdit ? 'Update Test Run' : 'Create Test Run')}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestRunForm;
