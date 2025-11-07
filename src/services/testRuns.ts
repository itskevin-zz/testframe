import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestRun } from '../types/testCase';

const COLLECTION_NAME = 'testRuns';

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
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    );

    if (querySnapshot.empty) {
      return 'TR001';
    }

    const lastDoc = querySnapshot.docs[0];
    const lastId = lastDoc.data().id as string;
    const match = lastId.match(/TR(\d+)/);

    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `TR${num.toString().padStart(3, '0')}`;
    }

    return 'TR001';
  },

  // Create a new test run
  async create(testRun: TestRun): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        id: testRun.id,
        name: testRun.name,
        description: testRun.description || '',
        createdBy: testRun.createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: testRun.status,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating test run:', error);
      throw error;
    }
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
};
