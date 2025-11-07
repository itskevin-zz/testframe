import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import type { TestCase, TestType, Priority, Component } from '../types/testCase';
import { componentsService } from '../services/components';
import { testCasesService } from '../services/testCases';

const TestCaseForm = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [components, setComponents] = useState<Component[]>([]);
  const [formData, setFormData] = useState<Omit<TestCase, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>({
    component: '',
    feature: '',
    testType: 'Functional',
    priority: 'P1',
    preconditions: '',
    testSteps: '',
    expectedResult: '',
  });
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

      // Load components
      const comps = await componentsService.getAll();
      setComponents(comps);

      // If editing, load the test case
      if (isEdit && id) {
        const testCase = await testCasesService.getById(id);
        if (testCase) {
          setFormData({
            component: testCase.component,
            feature: testCase.feature,
            testType: testCase.testType,
            priority: testCase.priority,
            preconditions: testCase.preconditions,
            testSteps: testCase.testSteps,
            expectedResult: testCase.expectedResult,
          });
        } else {
          setError('Test case not found');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
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

    try {
      setSaving(true);
      setError(null);

      if (isEdit && id) {
        // Update existing test case
        await testCasesService.update(id, formData);
      } else {
        // Create new test case
        const testId = await testCasesService.generateTestId();
        const testCase: TestCase = {
          id: testId,
          ...formData,
          createdBy: user.email || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await testCasesService.create(testCase);
      }

      navigate('/test-cases');
    } catch (err) {
      console.error('Error saving test case:', err);
      setError('Failed to save test case. Please try again.');
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
              <button onClick={() => navigate('/dashboard')} className="focus:outline-none"><img src="/logo.png" alt="TestFrame" className="h-10" /></button>
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

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {isEdit ? 'Edit Test Case' : 'Create Test Case'}
            </h2>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded">
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
            <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="component" className="block text-sm font-medium text-slate-700">
                    Component *
                  </label>
                  <select
                    id="component"
                    required
                    value={formData.component}
                    onChange={(e) => handleChange('component', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm rounded-md border"
                  >
                    <option value="">Select a component</option>
                    {components.map(comp => (
                      <option key={comp.id} value={comp.name}>{comp.name}</option>
                    ))}
                  </select>
                  {components.length === 0 && (
                    <p className="mt-1 text-sm text-orange-600">
                      No components available. Add components in{' '}
                      <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="underline hover:text-orange-700"
                      >
                        Settings
                      </button>
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="testType" className="block text-sm font-medium text-slate-700">
                    Test Type *
                  </label>
                  <select
                    id="testType"
                    required
                    value={formData.testType}
                    onChange={(e) => handleChange('testType', e.target.value as TestType)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm rounded-md border"
                  >
                    <option value="Functional">Functional</option>
                    <option value="Integration">Integration</option>
                    <option value="Performance">Performance</option>
                    <option value="Security">Security</option>
                    <option value="Regression">Regression</option>
                    <option value="Smoke">Smoke</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-slate-700">
                    Priority *
                  </label>
                  <select
                    id="priority"
                    required
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value as Priority)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm rounded-md border"
                  >
                    <option value="P0">P0 - Critical</option>
                    <option value="P1">P1 - High</option>
                    <option value="P2">P2 - Medium</option>
                    <option value="P3">P3 - Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="feature" className="block text-sm font-medium text-slate-700">
                  Feature *
                </label>
                <input
                  type="text"
                  id="feature"
                  required
                  value={formData.feature}
                  onChange={(e) => handleChange('feature', e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm"
                  placeholder="e.g., New student user registration via email link"
                />
              </div>

              <div>
                <label htmlFor="preconditions" className="block text-sm font-medium text-slate-700">
                  Preconditions * <span className="text-slate-400 font-normal">(Markdown supported)</span>
                </label>
                <textarea
                  id="preconditions"
                  required
                  rows={4}
                  value={formData.preconditions}
                  onChange={(e) => handleChange('preconditions', e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm font-mono"
                  placeholder="- Student email does not exist&#10;- Valid email link received&#10;- Use **bold** or *italic* for emphasis"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Supports Markdown: **bold**, *italic*, lists, links, etc.
                </p>
              </div>

              <div>
                <label htmlFor="testSteps" className="block text-sm font-medium text-slate-700">
                  Test Steps * <span className="text-slate-400 font-normal">(Markdown supported)</span>
                </label>
                <textarea
                  id="testSteps"
                  required
                  rows={8}
                  value={formData.testSteps}
                  onChange={(e) => handleChange('testSteps', e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm font-mono"
                  placeholder="1. Click on **email invitation link**&#10;2. Enter valid phone number (e.g., `+1-416-555-0123`)&#10;3. Enter name&#10;..."
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use numbered lists, **bold** for UI elements, `code` for values
                </p>
              </div>

              <div>
                <label htmlFor="expectedResult" className="block text-sm font-medium text-slate-700">
                  Expected Result * <span className="text-slate-400 font-normal">(Markdown supported)</span>
                </label>
                <textarea
                  id="expectedResult"
                  required
                  rows={6}
                  value={formData.expectedResult}
                  onChange={(e) => handleChange('expectedResult', e.target.value)}
                  className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-stone-500 focus:border-stone-500 sm:text-sm font-mono"
                  placeholder="- Phone validation **passes**&#10;- SMS sent within `30 seconds`&#10;- User record created with:&#10;  - email, phone, name populated&#10;  - status = `active`"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Use lists, **bold** for important items, `code` for values
                </p>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 text-right sm:px-6 space-x-3 rounded-b-lg">
              <button
                type="button"
                onClick={() => navigate('/test-cases')}
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-stone-500 hover:bg-stone-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : (isEdit ? 'Update Test Case' : 'Create Test Case')}
              </button>
            </div>
          </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default TestCaseForm;
