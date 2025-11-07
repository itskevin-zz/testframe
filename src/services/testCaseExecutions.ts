import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestCaseExecution } from '../types/testCase';

const COLLECTION_NAME = 'testCaseExecutions';

export const testCaseExecutionsService = {
  // Get all executions for a specific test run
  async getByTestRunId(testRunId: string): Promise<TestCaseExecution[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('testRunId', '==', testRunId)
      );
      const querySnapshot = await getDocs(q);

      const results = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testRunId: data.testRunId,
          testCaseId: data.testCaseId,
          actualResult: data.actualResult,
          status: data.status,
          testedBy: data.testedBy,
          executionDate: data.executionDate?.toDate() || new Date(),
          notes: data.notes,
        };
      });

      // Sort by executionDate in memory instead of in query
      results.sort((a, b) => b.executionDate.getTime() - a.executionDate.getTime());

      return results;
    } catch (error) {
      console.error('Error fetching test case executions:', error);
      throw error;
    }
  },

  // Get all executions for a specific test case
  async getByTestCaseId(testCaseId: string): Promise<TestCaseExecution[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('testCaseId', '==', testCaseId)
      );
      const querySnapshot = await getDocs(q);

      const results = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          testRunId: data.testRunId,
          testCaseId: data.testCaseId,
          actualResult: data.actualResult,
          status: data.status,
          testedBy: data.testedBy,
          executionDate: data.executionDate?.toDate() || new Date(),
          notes: data.notes,
        };
      });

      // Sort by executionDate in memory instead of in query
      results.sort((a, b) => b.executionDate.getTime() - a.executionDate.getTime());

      return results;
    } catch (error) {
      console.error('Error fetching test case executions:', error);
      throw error;
    }
  },

  // Get a specific execution by ID
  async getById(id: string): Promise<TestCaseExecution | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        testRunId: data.testRunId,
        testCaseId: data.testCaseId,
        actualResult: data.actualResult,
        status: data.status,
        testedBy: data.testedBy,
        executionDate: data.executionDate?.toDate() || new Date(),
        notes: data.notes,
      };
    } catch (error) {
      console.error('Error fetching test case execution:', error);
      throw error;
    }
  },

  // Create a new execution
  async create(execution: Omit<TestCaseExecution, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        testRunId: execution.testRunId,
        testCaseId: execution.testCaseId,
        actualResult: execution.actualResult,
        status: execution.status,
        testedBy: execution.testedBy,
        executionDate: Timestamp.now(),
        notes: execution.notes || '',
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating test case execution:', error);
      throw error;
    }
  },

  // Update an execution
  async update(id: string, updates: Partial<Omit<TestCaseExecution, 'id' | 'testRunId' | 'testCaseId' | 'executionDate'>>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error('Error updating test case execution:', error);
      throw error;
    }
  },

  // Delete an execution
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting test case execution:', error);
      throw error;
    }
  },

  // Get statistics for a test run
  async getTestRunStats(testRunId: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    blocked: number;
    skipped: number;
    notRun: number;
  }> {
    try {
      const executions = await this.getByTestRunId(testRunId);

      return {
        total: executions.length,
        passed: executions.filter(e => e.status === 'Pass').length,
        failed: executions.filter(e => e.status === 'Fail').length,
        blocked: executions.filter(e => e.status === 'Blocked').length,
        skipped: executions.filter(e => e.status === 'Skip').length,
        notRun: 0, // Will be calculated by comparing with total test cases in the run
      };
    } catch (error) {
      console.error('Error calculating test run stats:', error);
      throw error;
    }
  },
};
