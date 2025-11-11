import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  setDoc,
  runTransaction,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestRun } from '../types/testCase';

const COLLECTION_NAME = 'testRuns';
const COUNTERS_COLLECTION = 'appMetadata';
const TEST_RUN_COUNTER_DOC = 'testRunCounter';
const MAX_ID_ATTEMPTS = 5;

const formatTestRunId = (num: number) => `TR${num.toString().padStart(3, '0')}`;

const extractRunNumber = (id?: string): number => {
  if (!id) return 0;
  const match = id.match(/TR(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const getSeedRunNumber = async (): Promise<number> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return 0;
    }
    const lastId = snapshot.docs[0].data().id as string | undefined;
    return extractRunNumber(lastId);
  } catch (error) {
    console.error('Error determining seed test run number:', error);
    return 0;
  }
};

export const testRunsService = {
  // Get all test runs
  async getAll(): Promise<TestRun[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          status: data.status,
        };
      });
    } catch (error) {
      console.error('Error fetching test runs:', error);
      throw error;
    }
  },

  // Get a specific test run by ID
  async getById(id: string): Promise<TestRun | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        status: data.status,
      };
    } catch (error) {
      console.error('Error fetching test run:', error);
      throw error;
    }
  },

  // Generate a unique test run ID (TR001, TR002, etc.)
  async generateTestRunId(): Promise<string> {
    const counterRef = doc(db, COUNTERS_COLLECTION, TEST_RUN_COUNTER_DOC);
    const seedValue = await getSeedRunNumber();

    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const nextNumber = await runTransaction(db, async transaction => {
        const counterSnap = await transaction.get(counterRef);
        const currentValue = counterSnap.exists()
          ? counterSnap.data().current ?? seedValue
          : seedValue;
        const next = currentValue + 1;
        transaction.set(counterRef, { current: next });
        return next;
      });

      const candidateId = formatTestRunId(nextNumber);
      const docRef = doc(db, COLLECTION_NAME, candidateId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return candidateId;
      }

      console.warn(`Generated test run ID ${candidateId} already exists. Retrying...`);
    }

    throw new Error('Unable to generate a unique test run ID. Please try again.');
  },

  // Create a new test run
  async create(testRun: TestRun): Promise<string> {
    try {
      const docRef = doc(db, COLLECTION_NAME, testRun.id);
      const existing = await getDoc(docRef);
      if (existing.exists()) {
        throw new Error(`Test run with ID ${testRun.id} already exists.`);
      }

      await setDoc(docRef, {
        id: testRun.id,
        name: testRun.name,
        description: testRun.description || '',
        createdBy: testRun.createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: testRun.status,
      });
      return testRun.id;
    } catch (error) {
      console.error('Error creating test run:', error);
      throw error;
    }
  },

  /**
   * Create a test run while automatically handling ID generation collisions.
   * This is useful in multi-user scenarios where another client could create
   * the same ID between generation and document creation.
   */
  async createWithGeneratedId(testRun: Omit<TestRun, 'id'>): Promise<string> {
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const candidateId = await this.generateTestRunId();
      try {
        await this.create({
          ...testRun,
          id: candidateId,
        });
        return candidateId;
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.warn(`[testRunsService] ID ${candidateId} already existed during creation. Retrying...`);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Unable to create a unique test run. Please try again.');
  },

  // Update a test run
  async update(id: string, updates: Partial<Omit<TestRun, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating test run:', error);
      throw error;
    }
  },

  // Delete a test run
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
      console.error('Error deleting test run:', error);
      throw error;
    }
  },

  // Check if a test run name already exists
  async nameExists(name: string): Promise<boolean> {
    try {
      const allRuns = await this.getAll();
      return allRuns.some(run => run.name.toLowerCase() === name.toLowerCase());
    } catch (error) {
      console.error('Error checking test run name:', error);
      throw error;
    }
  },

  // Duplicate a test run (Note: test case executions are duplicated separately by the caller)
  async duplicate(id: string, createdBy: string, customName?: string): Promise<string> {
    try {
      // Get the original test run
      const original = await this.getById(id);
      if (!original) {
        throw new Error('Test run not found');
      }

      // Use custom name if provided, otherwise append (Copy)
      const newName = customName || `${original.name} (Copy)`;

      // Check if name already exists
      if (await this.nameExists(newName)) {
        throw new Error('A test run with this name already exists');
      }

      // Create the new test run with modified name
      const newId = await this.createWithGeneratedId({
        name: newName,
        description: original.description,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'Not Started',
      });
      return newId;
    } catch (error) {
      console.error('Error duplicating test run:', error);
      throw error;
    }
  },
};
