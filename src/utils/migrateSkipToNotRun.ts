import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Migration script to update all 'Skip' status executions with no actualResult to 'Not Run'
 * This is a one-time migration to fix the semantic meaning of test execution statuses
 */
export async function migrateSkipToNotRun() {
  try {
    const q = query(
      collection(db, 'testCaseExecutions'),
      where('status', '==', 'Skip')
    );

    const querySnapshot = await getDocs(q);
    let migratedCount = 0;
    let skippedCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();

      // Only migrate executions that have no actual result (meaning they weren't actually executed)
      if (!data.actualResult || data.actualResult.trim() === '') {
        await updateDoc(doc(db, 'testCaseExecutions', docSnapshot.id), {
          status: 'Not Run'
        });
        migratedCount++;
      } else {
        // Keep as 'Skip' if there's an actual result (test was intentionally skipped during execution)
        skippedCount++;
      }
    }

    return {
      totalFound: querySnapshot.size,
      migratedToNotRun: migratedCount,
      keptAsSkip: skippedCount
    };
  } catch (error) {
    console.error('Error migrating Skip to Not Run:', error);
    throw error;
  }
}
