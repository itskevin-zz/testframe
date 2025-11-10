import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import type { TestRun, TestCase, TestRunTemplate } from '../types/testCase';
import { testRunsService } from '../services/testRuns';
import { testCasesService } from '../services/testCases';
import { testRunTemplatesService } from '../services/testRunTemplates';
import { testCaseExecutionsService } from '../services/testCaseExecutions';
import { colors, colorHelpers } from '../config/colors';
import TestCaseOrderPanel from '../components/TestCaseOrderPanel';

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
  const [selectedTestCases, setSelectedTestCases] = useState<TestCase[]>([]);
  const [selectedTestCasesSet, setSelectedTestCasesSet] = useState<Set<string>>(new Set());
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
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

          // Load associated test cases in order
          const executions = await testCaseExecutionsService.getByTestRunId(id);
          const sortedExecutions = executions.sort((a, b) => a.order - b.order);

          // Remove duplicates by using a Set to track seen IDs
          const seenIds = new Set<string>();
          const orderedTestCases = sortedExecutions
            .map(exec => testCasesList.find(tc => tc.id === exec.testCaseId))
            .filter((tc): tc is TestCase => {
              if (!tc || seenIds.has(tc.id)) return false;
              seenIds.add(tc.id);
              return true;
            });

          // Update both state and set, ensuring they're in sync
          setSelectedTestCases(orderedTestCases);
          setSelectedTestCasesSet(new Set(orderedTestCases.map(tc => tc.id)));
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
        const templateTestCases = template.testCaseIds
          .map(id => allTestCases.find(tc => tc.id === id))
          .filter((tc): tc is TestCase => !!tc);
        setSelectedTestCases(templateTestCases);
        setSelectedTestCasesSet(new Set(template.testCaseIds));
      }
    }
  };

  const handleTestCaseToggle = (testCaseId: string) => {
    setSelectedTestCasesSet(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testCaseId)) {
        newSet.delete(testCaseId);
        // Remove from ordered array
        setSelectedTestCases(current => current.filter(tc => tc.id !== testCaseId));
      } else {
        newSet.add(testCaseId);
        // Add to ordered array only if not already present
        setSelectedTestCases(current => {
          // Check if already exists to prevent duplicates
          if (current.some(tc => tc.id === testCaseId)) {
            return current;
          }
          const testCase = allTestCases.find(tc => tc.id === testCaseId);
          return testCase ? [...current, testCase] : current;
        });
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    // Get currently selected IDs
    const currentIds = new Set(selectedTestCases.map(tc => tc.id));

    // Add only filtered test cases that aren't already selected
    const newTestCases = filteredTestCases.filter(tc => !currentIds.has(tc.id));

    // Merge existing with new (preserving order of existing)
    const merged = [...selectedTestCases, ...newTestCases];

    setSelectedTestCases(merged);
    setSelectedTestCasesSet(new Set(merged.map(tc => tc.id)));
  };

  const handleDeselectAll = () => {
    setSelectedTestCases([]);
    setSelectedTestCasesSet(new Set());
  };

  const handleReorder = (orderedIds: string[]) => {
    const reorderedTestCases = orderedIds
      .map(id => allTestCases.find(tc => tc.id === id))
      .filter((tc): tc is TestCase => !!tc);
    setSelectedTestCases(reorderedTestCases);
  };

  const handleRemoveTestCase = (testCaseId: string) => {
    setSelectedTestCases(prev => prev.filter(tc => tc.id !== testCaseId));
    setSelectedTestCasesSet(prev => {
      const newSet = new Set(prev);
      newSet.delete(testCaseId);
      return newSet;
    });
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredTestCases = allTestCases.filter(tc => {
    if (filterComponent !== 'all' && tc.component !== filterComponent) return false;
    if (filterPriority !== 'all' && tc.priority !== filterPriority) return false;
    return true;
  });

  const uniqueComponents = Array.from(new Set(allTestCases.map(tc => tc.component)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (selectedTestCases.length === 0) {
      setError('Please select at least one test case');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Deduplicate selected test cases before processing
      const seenIds = new Set<string>();
      const uniqueSelectedTestCases = selectedTestCases.filter(tc => {
        if (seenIds.has(tc.id)) return false;
        seenIds.add(tc.id);
        return true;
      });

      if (isEdit && id) {
        // Update existing test run
        await testRunsService.update(id, formData);

        // Update test case executions: remove deleted ones, update order, add new ones
        const existingExecutions = await testCaseExecutionsService.getByTestRunId(id);
        const existingTestCaseIds = new Set(existingExecutions.map(e => e.testCaseId));
        const selectedTestCaseIds = new Set(uniqueSelectedTestCases.map(tc => tc.id));

        // Delete removed test cases
        for (const execution of existingExecutions) {
          if (!selectedTestCaseIds.has(execution.testCaseId)) {
            await testCaseExecutionsService.delete(execution.id);
          }
        }

        // Update order for existing test cases
        for (let i = 0; i < uniqueSelectedTestCases.length; i++) {
          const execution = existingExecutions.find(e => e.testCaseId === uniqueSelectedTestCases[i].id);
          if (execution) {
            await testCaseExecutionsService.update(execution.id, { order: i });
          }
        }

        // Add new test cases
        for (let i = 0; i < uniqueSelectedTestCases.length; i++) {
          if (!existingTestCaseIds.has(uniqueSelectedTestCases[i].id)) {
            await testCaseExecutionsService.create({
              testRunId: id,
              testCaseId: uniqueSelectedTestCases[i].id,
              actualResult: '',
              status: 'Not Run',
              testedBy: '',
              executionDate: new Date(),
              notes: '',
              order: i,
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

        // Create test case executions for all selected test cases with order
        for (let i = 0; i < uniqueSelectedTestCases.length; i++) {
          await testCaseExecutionsService.create({
            testRunId: testRun.id,
            testCaseId: uniqueSelectedTestCases[i].id,
            actualResult: '',
            status: 'Not Run' as const,
            testedBy: '',
            executionDate: new Date(),
            notes: '',
            order: i,
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
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-slate-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-stone-500"
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

      <main className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {isEdit ? 'Edit Test Run' : 'Create Test Run'}
            </h2>
          </div>

          {error && (
            <div className={`mb-4 ${colors.danger.bgLight} border ${colors.danger.border} ${colors.danger.textDark} px-4 py-3 rounded`}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white shadow rounded-lg p-12">
              <div className="text-center">
                <p className="text-slate-500">Loading...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">Test Run Details</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`mt-1 block w-full border ${colors.form.input} rounded-md shadow-sm py-2 px-3 focus:outline-none ${colors.form.inputFocus} sm:text-sm`}
                      placeholder="e.g., Release 2.5.0, Sprint 10 Testing"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className={`mt-1 block w-full border ${colors.form.input} rounded-md shadow-sm py-2 px-3 focus:outline-none ${colors.form.inputFocus} sm:text-sm`}
                      placeholder="Optional description of this test run"
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700">
                      Status *
                    </label>
                    <select
                      id="status"
                      required
                      value={formData.status}
                      onChange={(e) => handleChange('status', e.target.value as TestRun['status'])}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${colors.form.input} border focus:outline-none ${colors.form.inputFocus} sm:text-sm rounded-md`}
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
                  <h3 className="text-lg font-medium text-slate-900">Select Test Cases</h3>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm border border-slate-300 rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1 text-sm border border-slate-300 rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {!isEdit && templates.length > 0 && (
                  <div className="mb-4">
                    <label htmlFor="template" className="block text-sm font-medium text-slate-700">
                      Load from Template
                    </label>
                    <select
                      id="template"
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${colors.form.input} border focus:outline-none ${colors.form.inputFocus} sm:text-sm rounded-md`}
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

                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="filter-component" className="block text-sm font-medium text-slate-700">
                      Filter by Component
                    </label>
                    <select
                      id="filter-component"
                      value={filterComponent}
                      onChange={(e) => setFilterComponent(e.target.value)}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${colors.form.input} border focus:outline-none ${colors.form.inputFocus} sm:text-sm rounded-md`}
                    >
                      <option value="all">All Components</option>
                      {uniqueComponents.map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="filter-priority" className="block text-sm font-medium text-slate-700">
                      Filter by Priority
                    </label>
                    <select
                      id="filter-priority"
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base ${colors.form.input} border focus:outline-none ${colors.form.inputFocus} sm:text-sm rounded-md`}
                    >
                      <option value="all">All Priorities</option>
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Medium</option>
                      <option value="P3">P3 - Low</option>
                    </select>
                  </div>
                </div>

                <div className="text-sm text-slate-600 mb-3">
                  Selected: {selectedTestCasesSet.size} test case{selectedTestCasesSet.size !== 1 ? 's' : ''} | Showing: {filteredTestCases.length} of {allTestCases.length}
                </div>

                {allTestCases.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No test cases available. Create test cases first.
                  </p>
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-md">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Component
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Feature
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Priority
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {filteredTestCases.map(testCase => (
                          <tr
                            key={testCase.id}
                            className={selectedTestCasesSet.has(testCase.id) ? colors.background.selected : colors.background.hover}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedTestCasesSet.has(testCase.id)}
                                onChange={() => handleTestCaseToggle(testCase.id)}
                                className="h-4 w-4 text-stone-600 focus:ring-stone-500 border-slate-300 rounded"
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                              {testCase.id}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                              {testCase.component}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {testCase.feature}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorHelpers.getPriorityBadge(testCase.priority)}`}>
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

              <TestCaseOrderPanel
                testCases={selectedTestCases}
                onReorder={handleReorder}
                onRemove={handleRemoveTestCase}
              />

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/test-runs')}
                  disabled={saving}
                  className="px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${colors.primary.bg} hover:${colors.primary.bgHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${colors.primary.ring} disabled:opacity-50 disabled:cursor-not-allowed`}
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
