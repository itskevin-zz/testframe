import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Component, TestCase, TestRunTemplate } from '../types/testCase';
import { componentsService } from '../services/components';
import { testRunTemplatesService } from '../services/testRunTemplates';
import { testCasesService } from '../services/testCases';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [components, setComponents] = useState<Component[]>([]);
  const [newComponent, setNewComponent] = useState({ name: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [templates, setTemplates] = useState<TestRunTemplate[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '' });
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [componentsData, templatesData, testCasesData] = await Promise.all([
        componentsService.getAll(),
        testRunTemplatesService.getAll(),
        testCasesService.getAll(),
      ]);
      setComponents(componentsData);
      setTemplates(templatesData);
      setTestCases(testCasesData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = async () => {
    if (!newComponent.name.trim()) return;

    try {
      setError(null);
      await componentsService.create({
        name: newComponent.name,
        description: newComponent.description,
      });

      // Reload data
      await loadData();
      setNewComponent({ name: '', description: '' });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding component:', err);
      setError('Failed to add component. Please try again.');
    }
  };

  const handleDeleteComponent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    try {
      setError(null);
      await componentsService.delete(id);
      // Reload data
      await loadData();
    } catch (err) {
      console.error('Error deleting component:', err);
      setError('Failed to delete component. Please try again.');
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.name.trim() || !user) return;

    if (selectedTestCases.size === 0) {
      setError('Please select at least one test case for the template');
      return;
    }

    try {
      setError(null);
      const templateId = await testRunTemplatesService.generateTemplateId();
      const template: TestRunTemplate = {
        id: templateId,
        name: newTemplate.name,
        description: newTemplate.description,
        testCaseIds: Array.from(selectedTestCases),
        createdBy: user.email || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await testRunTemplatesService.create(template);

      // Reload data
      await loadData();
      setNewTemplate({ name: '', description: '' });
      setSelectedTestCases(new Set());
      setIsAddingTemplate(false);
    } catch (err) {
      console.error('Error adding template:', err);
      setError('Failed to add template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      setError(null);
      await testRunTemplatesService.delete(id);
      // Reload data
      await loadData();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
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
    setSelectedTestCases(new Set(testCases.map(tc => tc.id)));
  };

  const handleDeselectAll = () => {
    setSelectedTestCases(new Set());
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
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test Cases
                </button>
                <button
                  onClick={() => navigate('/test-runs')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Test Runs
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-gray-900 px-3 py-2 rounded-md text-sm font-medium border-b-2 border-blue-600"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Components</h3>
                <button
                  onClick={() => setIsAdding(true)}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Component
                </button>
              </div>

              {isAdding && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Component Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={newComponent.name}
                        onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Authentication"
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="description"
                        rows={2}
                        value={newComponent.description}
                        onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewComponent({ name: '', description: '' });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComponent}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading components...</p>
                  </div>
                ) : components.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No components yet. Add one to get started.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {components.map((component) => (
                        <tr key={component.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {component.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {component.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {component.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteComponent(component.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Test Run Templates */}
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Test Run Templates</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create templates with pre-selected test cases for quick test run creation
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingTemplate(true)}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Template
                </button>
              </div>

              {isAddingTemplate && (
                <div className="mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
                        Template Name *
                      </label>
                      <input
                        type="text"
                        id="templateName"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Smoke Test Suite, Authentication Tests"
                      />
                    </div>
                    <div>
                      <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="templateDescription"
                        rows={2}
                        value={newTemplate.description}
                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Optional description"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Select Test Cases *
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="px-2 py-1 text-xs border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        Selected: {selectedTestCases.size} test case{selectedTestCases.size !== 1 ? 's' : ''}
                      </div>

                      {testCases.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No test cases available. Create test cases first.
                        </p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Select
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  ID
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Component
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Feature
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {testCases.map(testCase => (
                                <tr
                                  key={testCase.id}
                                  className={selectedTestCases.has(testCase.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                >
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <input
                                      type="checkbox"
                                      checked={selectedTestCases.has(testCase.id)}
                                      onChange={() => handleTestCaseToggle(testCase.id)}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {testCase.id}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                    {testCase.component}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-500">
                                    {testCase.feature}
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
                        onClick={() => {
                          setIsAddingTemplate(false);
                          setNewTemplate({ name: '', description: '' });
                          setSelectedTestCases(new Set());
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddTemplate}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No templates yet. Add one to get started.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Test Cases
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {templates.map((template) => (
                        <tr key={template.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {template.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {template.description || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {template.testCaseIds.length} test case{template.testCaseIds.length !== 1 ? 's' : ''}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {template.createdAt.toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
