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

// A test run is a collection of test case executions (e.g., for a release or feature set)
export interface TestRun {
  id: string; // Auto-generated unique ID (e.g., TR001, TR002)
  name: string; // e.g., "Release 2.5.0" or "User Authentication Feature"
  description?: string;
  createdBy: string; // User email from Google auth
  createdAt: Date;
  updatedAt: Date;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

// A test case execution is a single test case being run within a test run
export interface TestCaseExecution {
  id: string; // Auto-generated unique ID
  testRunId: string; // Reference to TestRun
  testCaseId: string; // Reference to TestCase
  actualResult: string;
  status: TestStatus;
  testedBy: string; // User email from Google auth
  executionDate: Date;
  notes?: string; // Optional additional notes
}

// A template for creating test runs with pre-selected test cases
export interface TestRunTemplate {
  id: string; // Auto-generated unique ID (e.g., TRT001, TRT002)
  name: string; // e.g., "Smoke Test Suite" or "Authentication Tests"
  description?: string;
  testCaseIds: string[]; // Array of TestCase IDs to include
  createdBy: string; // User email from Google auth
  createdAt: Date;
  updatedAt: Date;
}

export interface Component {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}
