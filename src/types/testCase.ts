export type TestType = 'Functional' | 'Integration' | 'Performance' | 'Security' | 'Regression' | 'Smoke';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type TestStatus = 'Pass' | 'Fail' | 'Blocked' | 'Skip';

export interface TestCase {
  id: string; // Auto-generated unique ID (e.g., TC001, TC002)
  component: string; // From enumerated list
  feature: string;
  testType: TestType;
  priority: Priority;
  preconditions: string;
  testSteps: string;
  expectedResult: string;
  createdBy: string; // User email from Google auth
  createdAt: Date;
  updatedAt: Date;
}

export interface TestRun {
  id: string; // Auto-generated unique ID
  testCaseId: string; // Reference to TestCase
  actualResult: string;
  status: TestStatus;
  testedBy: string; // User email from Google auth
  testRunDate: Date;
  notes?: string; // Optional additional notes
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}
