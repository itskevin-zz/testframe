import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Cleanup script to remove duplicate test case executions
 * This will keep only the first execution for each testCaseId in a test run
 */
export async function cleanupDuplicateExecutions(testRunId: string) {
  try {
    const q = query(
      collection(db, 'testCaseExecutions'),
      where('testRunId', '==', testRunId)
    );

    const querySnapshot = await getDocs(q);
    const executions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{
      id: string;
      testCaseId: string;
      testRunId: string;
      order?: number;
      [key: string]: any;
    }>;

    // Track which testCaseIds we've seen
    const seenTestCaseIds = new Set<string>();
    const duplicatesToDelete: string[] = [];

    // Sort by order to keep the ones with lower order numbers
    executions.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    for (const execution of executions) {
      const testCaseId = execution.testCaseId;

      if (seenTestCaseIds.has(testCaseId)) {
        // This is a duplicate
        duplicatesToDelete.push(execution.id);
      } else {
        // First occurrence, keep it
        seenTestCaseIds.add(testCaseId);
      }
    }

    // Delete duplicates
    for (const execId of duplicatesToDelete) {
      await deleteDoc(doc(db, 'testCaseExecutions', execId));
    }

    return {
      totalExecutions: executions.length,
      duplicatesDeleted: duplicatesToDelete.length,
      uniqueRemaining: seenTestCaseIds.size
    };
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    throw error;
  }
}

/**
 * Delete ALL executions for a test run (use with caution!)
 */
export async function deleteAllExecutionsForTestRun(testRunId: string) {
  try {
    const q = query(
      collection(db, 'testCaseExecutions'),
      where('testRunId', '==', testRunId)
    );

    const querySnapshot = await getDocs(q);

    const deletePromises = querySnapshot.docs.map(doc =>
      deleteDoc(doc.ref)
    );

    await Promise.all(deletePromises);

    return querySnapshot.size;
  } catch (error) {
    console.error('Error deleting executions:', error);
    throw error;
  }
}
