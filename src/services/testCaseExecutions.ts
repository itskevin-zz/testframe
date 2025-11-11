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
          order: data.order ?? 0,
        };
      });

      // Sort by order first, then by executionDate
      results.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.executionDate.getTime() - a.executionDate.getTime();
      });

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
          order: data.order ?? 0,
        };
      });

      // Sort by order first, then by executionDate
      results.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return b.executionDate.getTime() - a.executionDate.getTime();
      });

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
        order: data.order ?? 0,
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
        order: execution.order ?? 0,
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

      // Deduplicate by testCaseId to get accurate count
      const uniqueTestCaseIds = new Set(executions.map(e => e.testCaseId));
      const uniqueExecutions = Array.from(uniqueTestCaseIds).map(testCaseId =>
        executions.find(e => e.testCaseId === testCaseId)!
      );

      return {
        total: uniqueExecutions.length,
        passed: uniqueExecutions.filter(e => e.status === 'Pass').length,
        failed: uniqueExecutions.filter(e => e.status === 'Fail').length,
        blocked: uniqueExecutions.filter(e => e.status === 'Blocked').length,
        skipped: uniqueExecutions.filter(e => e.status === 'Skip').length,
        notRun: uniqueExecutions.filter(e => e.status === 'Not Run').length,
      };
    } catch (error) {
      console.error('Error calculating test run stats:', error);
      throw error;
    }
  },

  // Clean up duplicate test case executions for a test run
  // Keeps the first occurrence (by order) and deletes duplicates
  async cleanupDuplicates(testRunId: string): Promise<number> {
    try {
      const executions = await this.getByTestRunId(testRunId);
      const seenTestCaseIds = new Set<string>();
      const duplicatesToDelete: string[] = [];

      // Find duplicates
      for (const execution of executions) {
        if (seenTestCaseIds.has(execution.testCaseId)) {
          duplicatesToDelete.push(execution.id);
        } else {
          seenTestCaseIds.add(execution.testCaseId);
        }
      }

      // Delete duplicates
      for (const id of duplicatesToDelete) {
        await this.delete(id);
      }

      return duplicatesToDelete.length;
    } catch (error) {
      console.error('Error cleaning up duplicate executions:', error);
      throw error;
    }
  },

  // Clean up duplicates across all test runs
  async cleanupAllDuplicates(): Promise<{ testRunId: string; duplicatesRemoved: number }[]> {
    try {
      // Get all executions
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));

      // Group by testRunId
      const executionsByTestRun = new Map<string, TestCaseExecution[]>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const execution: TestCaseExecution = {
          id: doc.id,
          testRunId: data.testRunId,
          testCaseId: data.testCaseId,
          actualResult: data.actualResult,
          status: data.status,
          testedBy: data.testedBy,
          executionDate: data.executionDate?.toDate() || new Date(),
          notes: data.notes,
          order: data.order ?? 0,
        };

        if (!executionsByTestRun.has(execution.testRunId)) {
          executionsByTestRun.set(execution.testRunId, []);
        }
        executionsByTestRun.get(execution.testRunId)!.push(execution);
      });

      // Process each test run
      const results: { testRunId: string; duplicatesRemoved: number }[] = [];
      for (const [testRunId, executions] of executionsByTestRun) {
        const seenTestCaseIds = new Set<string>();
        const duplicatesToDelete: string[] = [];

        // Sort by order to keep the first one
        executions.sort((a, b) => a.order - b.order);

        for (const execution of executions) {
          if (seenTestCaseIds.has(execution.testCaseId)) {
            duplicatesToDelete.push(execution.id);
          } else {
            seenTestCaseIds.add(execution.testCaseId);
          }
        }

        // Delete duplicates
        for (const id of duplicatesToDelete) {
          await this.delete(id);
        }

        if (duplicatesToDelete.length > 0) {
          results.push({ testRunId, duplicatesRemoved: duplicatesToDelete.length });
        }
      }

      return results;
    } catch (error) {
      console.error('Error cleaning up all duplicates:', error);
      throw error;
    }
  },
};
