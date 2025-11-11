#!/usr/bin/env node

/**
 * Bulk Upload Script for Test Cases
 *
 * This script uploads test cases from a JSON file directly to Firestore.
 *
 * Usage:
 *   1. Create your test cases in testcases.json (see testcases-template.json)
 *   2. Set CREATED_BY email below (line 18)
 *   3. Run: node scripts/bulk-upload.mjs
 *
 * After upload is complete, you can safely delete the entire scripts/ folder.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// SET YOUR EMAIL HERE - this will be used for createdBy field
const CREATED_BY = 'kevin@getaddie.com'; // CHANGE THIS!

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load Firebase config from .env file
const envPath = join(__dirname, '../.env');
let firebaseConfig;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });

  firebaseConfig = {
    apiKey: envVars.VITE_FIREBASE_API_KEY,
    authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.VITE_FIREBASE_APP_ID,
  };
} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION_NAME = 'testCases';
const VALID_TEST_TYPES = ['Functional', 'Integration', 'Performance', 'Security', 'Regression', 'Smoke'];
const VALID_PRIORITIES = ['P0', 'P1', 'P2', 'P3'];

// Validate test case data
function validateTestCase(testCase, index) {
  const errors = [];

  if (!testCase.component || typeof testCase.component !== 'string') {
    errors.push(`component is required and must be a string`);
  }
  if (!testCase.feature || typeof testCase.feature !== 'string') {
    errors.push(`feature is required and must be a string`);
  }
  if (!VALID_TEST_TYPES.includes(testCase.testType)) {
    errors.push(`testType must be one of: ${VALID_TEST_TYPES.join(', ')}`);
  }
  if (!VALID_PRIORITIES.includes(testCase.priority)) {
    errors.push(`priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
  if (!testCase.preconditions || typeof testCase.preconditions !== 'string') {
    errors.push(`preconditions is required and must be a string`);
  }
  if (!testCase.testSteps || typeof testCase.testSteps !== 'string') {
    errors.push(`testSteps is required and must be a string`);
  }
  if (!testCase.expectedResult || typeof testCase.expectedResult !== 'string') {
    errors.push(`expectedResult is required and must be a string`);
  }

  if (errors.length > 0) {
    throw new Error(`Test case #${index + 1} validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}

// Generate next Test ID
async function generateNextTestId() {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    );

    if (querySnapshot.empty) {
      return 'TC001';
    }

    const lastDoc = querySnapshot.docs[0];
    const lastId = lastDoc.data().id;

    const match = lastId.match(/TC(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10) + 1;
      return `TC${num.toString().padStart(3, '0')}`;
    }

    return 'TC001';
  } catch (error) {
    console.error('❌ Error generating test ID:', error);
    throw error;
  }
}

// Main upload function
async function bulkUpload() {
  console.log('🚀 Starting bulk upload process...\n');

  // Check CREATED_BY is set
  if (CREATED_BY === 'your-email@example.com') {
    console.error('❌ Error: Please set CREATED_BY email in the script (line 18)');
    process.exit(1);
  }

  // Read test cases from JSON file
  const jsonPath = join(__dirname, 'testcases.json');
  let testCases;

  try {
    const jsonContent = readFileSync(jsonPath, 'utf-8');
    testCases = JSON.parse(jsonContent);
  } catch (error) {
    console.error('❌ Error reading testcases.json:', error.message);
    console.log('\n💡 Make sure testcases.json exists in the scripts/ folder');
    process.exit(1);
  }

  if (!Array.isArray(testCases)) {
    console.error('❌ Error: testcases.json must contain an array of test cases');
    process.exit(1);
  }

  console.log(`📋 Found ${testCases.length} test case(s) to upload\n`);

  // Validate all test cases first
  console.log('🔍 Validating test cases...');
  try {
    testCases.forEach((tc, index) => validateTestCase(tc, index));
    console.log('✅ All test cases validated successfully\n');
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    process.exit(1);
  }

  // Get starting test ID
  let currentId = await generateNextTestId();
  console.log(`🔢 Starting from test ID: ${currentId}\n`);

  // Upload each test case
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];

    try {
      const testCaseData = {
        id: currentId,
        component: testCase.component,
        feature: testCase.feature,
        testType: testCase.testType,
        priority: testCase.priority,
        preconditions: testCase.preconditions,
        testSteps: testCase.testSteps,
        expectedResult: testCase.expectedResult,
        createdBy: CREATED_BY,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), testCaseData);

      console.log(`✅ [${i + 1}/${testCases.length}] ${currentId} - ${testCase.feature}`);
      console.log(`   Component: ${testCase.component} | Priority: ${testCase.priority} | Type: ${testCase.testType}`);
      console.log(`   Firestore Doc ID: ${docRef.id}\n`);

      successCount++;

      // Generate next ID
      const match = currentId.match(/TC(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        currentId = `TC${num.toString().padStart(3, '0')}`;
      }

    } catch (error) {
      console.error(`❌ [${i + 1}/${testCases.length}] Failed to upload test case:`, error.message);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📝 Total: ${testCases.length}`);
  console.log('='.repeat(60));

  if (successCount > 0) {
    console.log('\n🎉 Upload complete! You can now log in to your app and see the test cases.');
    console.log('💡 You can safely delete the scripts/ folder when done.');
  }
}

// Run the upload
bulkUpload().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
