import { collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { TestRunTemplate } from '../types/testCase';

const COLLECTION_NAME = 'testRunTemplates';

export const testRunTemplatesService = {
  async getAll(): Promise<TestRunTemplate[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        testCaseIds: data.testCaseIds || [],
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
    });
  },

  async getById(id: string): Promise<TestRunTemplate | null> {
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
      testCaseIds: data.testCaseIds || [],
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  },

  async generateTemplateId(): Promise<string> {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    );

    if (querySnapshot.empty) {
      return 'TRT001';
    }

    const lastDoc = querySnapshot.docs[0];
    const lastId = lastDoc.data().id as string;
    const match = lastId.match(/TRT(\d+)/);

    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `TRT${num.toString().padStart(3, '0')}`;
    }

    return 'TRT001';
  },

  async create(template: TestRunTemplate): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      id: template.id,
      name: template.name,
      description: template.description || '',
      testCaseIds: template.testCaseIds,
      createdBy: template.createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  },

  async update(id: string, updates: Partial<Omit<TestRunTemplate, 'id' | 'createdBy' | 'createdAt'>>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },
};
