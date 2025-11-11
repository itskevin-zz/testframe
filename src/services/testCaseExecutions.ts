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
  runTransaction,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestCaseExecution } from '../types/testCase';

const COLLECTION_NAME = 'testCaseExecutions';
const LOCK_COLLECTION_NAME = 'testRunLocks';
const LOCK_TTL_MS = 2 * 60 * 1000; // 2 minutes

const localLockTokens = new Map<string, string>();

const getTabId = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return 'server';
  }
  const existing = window.sessionStorage.getItem('tabId');
  if (existing) {
    return existing;
  }
  const newId = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem('tabId', newId);
  return newId;
};

export class TestRunLockedError extends Error {
  public readonly lockOwner?: string;

  constructor(message: string, lockOwner?: string) {
    super(message);
    this.name = 'TestRunLockedError';
    this.lockOwner = lockOwner;
  }
}

export const testCaseExecutionsService = {
  // Acquire a short-lived lock for a test run to prevent concurrent writes
  async acquireTestRunLock(
    testRunId: string,
    options: { lockedBy?: string; reason?: string } = {}
  ): Promise<string> {
    const tabId = getTabId();
    const lockId = `${tabId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const lockRef = doc(db, LOCK_COLLECTION_NAME, testRunId);

    return runTransaction(db, async transaction => {
      const existing = await transaction.get(lockRef);
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + LOCK_TTL_MS));

      if (existing.exists()) {
        const data = existing.data();
        const expires = data.expiresAt?.toDate() || new Date(0);
        if (expires.getTime() > Date.now() && data.tabId !== tabId) {
          throw new TestRunLockedError(
            `Test run ${testRunId} is currently being modified by another tab.`,
            data.lockedBy || data.tabId
          );
        }
      }

      transaction.set(lockRef, {
        lockId,
        tabId,
        lockedBy: options.lockedBy || 'unknown',
        reason: options.reason || 'unspecified',
        lockedAt: now,
        expiresAt,
      });

      localLockTokens.set(testRunId, lockId);
      console.log(
        `[LOCK][TAB-${tabId}] Acquired lock ${lockId} for testRunId: ${testRunId} (${options.reason || 'unspecified'})`
      );

      return lockId;
    });
  },

  // Release a previously acquired lock
  async releaseTestRunLock(testRunId: string, lockId?: string): Promise<void> {
    const tabId = getTabId();
    const effectiveLockId = lockId || localLockTokens.get(testRunId);
    if (!effectiveLockId) {
      return;
    }

    const lockRef = doc(db, LOCK_COLLECTION_NAME, testRunId);

    await runTransaction(db, async transaction => {
      const existing = await transaction.get(lockRef);
      if (!existing.exists()) {
        localLockTokens.delete(testRunId);
        return;
      }

      const data = existing.data();
      if (data.lockId === effectiveLockId || data.tabId === tabId) {
        transaction.delete(lockRef);
        console.log(`[LOCK][TAB-${tabId}] Released lock ${effectiveLockId} for testRunId: ${testRunId}`);
      }
    });

    if (localLockTokens.get(testRunId) === effectiveLockId) {
      localLockTokens.delete(testRunId);
    }
  },

  // Internal utility to ensure this tab owns the lock before writing
  async _assertLockOwnership(testRunId: string): Promise<void> {
    const tabId = getTabId();
    const lockRef = doc(db, LOCK_COLLECTION_NAME, testRunId);
    const lockSnap = await getDoc(lockRef);

    if (!lockSnap.exists()) {
      throw new TestRunLockedError(
        `No active lock found for test run ${testRunId}. Please retry your action.`,
        'unknown'
      );
    }

    const data = lockSnap.data();
    const expires = data.expiresAt?.toDate() || new Date(0);
    if (expires.getTime() <= Date.now()) {
      // Expired lock – clean up and ask user to retry
      await deleteDoc(lockRef);
      localLockTokens.delete(testRunId);
      throw new TestRunLockedError(
        `The lock for test run ${testRunId} expired. Please start the operation again.`,
        data.lockedBy || data.tabId
      );
    }

    const localLockId = localLockTokens.get(testRunId);
    if (!localLockId || data.lockId !== localLockId || data.tabId !== tabId) {
      throw new TestRunLockedError(
        `Test run ${testRunId} is locked by another tab.`,
        data.lockedBy || data.tabId
      );
    }
  },

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

  // Check if an execution exists for a test run and test case combination
  async existsByTestRunAndTestCase(testRunId: string, testCaseId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('testRunId', '==', testRunId),
        where('testCaseId', '==', testCaseId)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking execution existence:', error);
      throw error;
    }
  },

  // Create a new execution
  async create(execution: Omit<TestCaseExecution, 'id'>): Promise<string> {
    try {
      // Generate unique call ID for tracking
      const callId = Math.random().toString(36).substr(2, 9);
      const tabId = getTabId();

      await this._assertLockOwnership(execution.testRunId);

      console.log(`[CREATE-${callId}][TAB-${tabId}] Starting create for testCaseId: ${execution.testCaseId}, testRunId: ${execution.testRunId}, order: ${execution.order}`);

      // Check if this exact execution already exists to prevent duplicates from multiple tabs
      const exists = await this.existsByTestRunAndTestCase(
        execution.testRunId,
        execution.testCaseId
      );

      if (exists) {
        console.warn(`[CREATE-${callId}][TAB-${tabId}] DUPLICATE PREVENTED - Execution already exists for testCaseId: ${execution.testCaseId}, testRunId: ${execution.testRunId}`);
        // Get the existing execution ID and return it
        const q = query(
          collection(db, COLLECTION_NAME),
          where('testRunId', '==', execution.testRunId),
          where('testCaseId', '==', execution.testCaseId)
        );
        const querySnapshot = await getDocs(q);
        const existingId = querySnapshot.docs[0]?.id || '';
        console.log(`[CREATE-${callId}][TAB-${tabId}] Returning existing execution ID: ${existingId}`);
        return existingId;
      }

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

      console.log(`[CREATE-${callId}][TAB-${tabId}] Successfully created doc ${docRef.id} for testCaseId: ${execution.testCaseId}`);
      return docRef.id;
    } catch (error) {
      console.error(`[CREATE-ERROR] Failed for testCaseId: ${execution.testCaseId}, testRunId: ${execution.testRunId}`, error);
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

  // Delete all executions for a given test run
  async deleteByTestRunId(testRunId: string): Promise<void> {
    try {
      const executions = await this.getByTestRunId(testRunId);
      await Promise.all(executions.map(exec => this.delete(exec.id)));
    } catch (error) {
      console.error('Error deleting executions for test run:', error);
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
