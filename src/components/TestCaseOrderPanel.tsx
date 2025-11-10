import type { TestCase } from '../types/testCase';
import { colorHelpers } from '../config/colors';

interface OrderedTestCase {
  testCase: TestCase;
  order: number;
}

interface TestCaseOrderPanelProps {
  testCases: TestCase[];
  onReorder: (orderedIds: string[]) => void;
  onRemove: (testCaseId: string) => void;
}

const TestCaseOrderPanel = ({
  testCases,
  onReorder,
  onRemove,
}: TestCaseOrderPanelProps) => {
  const orderedTestCases: OrderedTestCase[] = testCases.map((tc, idx) => ({
    testCase: tc,
    order: idx + 1,
  }));

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...testCases];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    onReorder(newOrder.map(tc => tc.id));
  };

  const moveDown = (index: number) => {
    if (index === testCases.length - 1) return;
    const newOrder = [...testCases];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    onReorder(newOrder.map(tc => tc.id));
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-slate-900 mb-4">
        Test Case Order ({testCases.length})
      </h3>

      {testCases.length === 0 ? (
        <p className="text-sm text-slate-500">
          No test cases selected. Select test cases above to add them to this test run.
        </p>
      ) : (
        <div className="space-y-2">
          {orderedTestCases.map(({ testCase, order }, index) => (
            <div
              key={testCase.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className="text-lg font-semibold text-slate-400 w-8">
                  {order}.
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {testCase.id} - {testCase.feature}
                  </div>
                  <div className="text-xs text-slate-500">
                    {testCase.component}
                  </div>
                </div>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorHelpers.getPriorityBadge(testCase.priority)}`}>
                  {testCase.priority}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === testCases.length - 1}
                  className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(testCase.id)}
                  className={`p-2 text-slate-400 hover:text-rose-600`}
                  title="Remove"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestCaseOrderPanel;
