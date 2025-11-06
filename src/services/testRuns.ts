import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestRun } from '../types/testCase';

const COLLECTION_NAME = 'testRuns';

export const testRunsService = {
  // Get all test runs for a specific test case
  async getByTestCaseId(testCaseId: string): Promise<TestRun[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('testCaseId', '==', testCaseId),
        orderBy('testRunDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testCaseId: data.testCaseId,
          actualResult: data.actualResult,
          status: data.status,
          testedBy: data.testedBy,
          testRunDate: data.testRunDate?.toDate() || new Date(),
          notes: data.notes,
        };
      });
    } catch (error) {
      console.error('Error fetching test runs:', error);
      throw error;
    }
  },

  // Get all test runs (for dashboard statistics, etc.)
  async getAll(): Promise<TestRun[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('testRunDate', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testCaseId: data.testCaseId,
          actualResult: data.actualResult,
          status: data.status,
          testedBy: data.testedBy,
          testRunDate: data.testRunDate?.toDate() || new Date(),
          notes: data.notes,
        };
      });
    } catch (error) {
      console.error('Error fetching all test runs:', error);
      throw error;
    }
  },

  // Create a new test run
  async create(testRun: Omit<TestRun, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        testCaseId: testRun.testCaseId,
        actualResult: testRun.actualResult,
        status: testRun.status,
        testedBy: testRun.testedBy,
        testRunDate: Timestamp.now(),
        notes: testRun.notes || '',
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating test run:', error);
      throw error;
    }
  },

  // Get latest test run for each test case (useful for dashboard)
  async getLatestForEachTestCase(): Promise<Map<string, TestRun>> {
    try {
      const allRuns = await this.getAll();
      const latestRuns = new Map<string, TestRun>();

      // Group by testCaseId and keep only the latest
      allRuns.forEach(run => {
        const existing = latestRuns.get(run.testCaseId);
        if (!existing || run.testRunDate > existing.testRunDate) {
          latestRuns.set(run.testCaseId, run);
        }
      });

      return latestRuns;
    } catch (error) {
      console.error('Error fetching latest test runs:', error);
      throw error;
    }
  },
};
