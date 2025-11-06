import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestCase } from '../types/testCase';

const COLLECTION_NAME = 'testCases';

export const testCasesService = {
  // Generate next Test ID
  async generateTestId(): Promise<string> {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
      );

      if (querySnapshot.empty) {
        return 'TC001';
      }

      // Get the last test case ID
      const lastDoc = querySnapshot.docs[0];
      const lastId = lastDoc.data().id as string;

      // Extract number from TC### format
      const match = lastId.match(/TC(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        return `TC${num.toString().padStart(3, '0')}`;
      }

      return 'TC001';
    } catch (error) {
      console.error('Error generating test ID:', error);
      // Fallback to timestamp-based ID
      const num = (Date.now() % 10000).toString().padStart(4, '0');
      return `TC${num}`;
    }
  },

  // Get all test cases with optional filters
  async getAll(filters?: {
    component?: string;
    priority?: string;
  }): Promise<TestCase[]> {
    try {
      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

      if (filters?.component) {
        constraints.push(where('component', '==', filters.component));
      }
      if (filters?.priority) {
        constraints.push(where('priority', '==', filters.priority));
      }

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.id,
          component: data.component,
          feature: data.feature,
          testType: data.testType,
          priority: data.priority,
          preconditions: data.preconditions,
          testSteps: data.testSteps,
          expectedResult: data.expectedResult,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      });
    } catch (error) {
      console.error('Error fetching test cases:', error);
      throw error;
    }
  },

  // Get a single test case by ID
  async getById(testCaseId: string): Promise<TestCase | null> {
    try {
      // First, try to get by document ID
      const docRef = doc(db, COLLECTION_NAME, testCaseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: data.id,
          component: data.component,
          feature: data.feature,
          testType: data.testType,
          priority: data.priority,
          preconditions: data.preconditions,
          testSteps: data.testSteps,
          expectedResult: data.expectedResult,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      // If not found by document ID, search by the id field (TC001, etc.)
      const q = query(collection(db, COLLECTION_NAME), where('id', '==', testCaseId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        return {
          id: data.id,
          component: data.component,
          feature: data.feature,
          testType: data.testType,
          priority: data.priority,
          preconditions: data.preconditions,
          testSteps: data.testSteps,
          expectedResult: data.expectedResult,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching test case:', error);
      throw error;
    }
  },

  // Create a new test case
  async create(testCase: TestCase): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        id: testCase.id,
        component: testCase.component,
        feature: testCase.feature,
        testType: testCase.testType,
        priority: testCase.priority,
        preconditions: testCase.preconditions,
        testSteps: testCase.testSteps,
        expectedResult: testCase.expectedResult,
        createdBy: testCase.createdBy,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating test case:', error);
      throw error;
    }
  },

  // Update an existing test case
  async update(testCaseId: string, updates: Partial<TestCase>): Promise<void> {
    try {
      // First, find the document by the id field
      const q = query(collection(db, COLLECTION_NAME), where('id', '==', testCaseId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('Test case not found');
      }

      const docRef = doc(db, COLLECTION_NAME, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating test case:', error);
      throw error;
    }
  },
};
