/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin SDK
admin.initializeApp();

const ALLOWED_DOMAINS = ["getaddie.com"];

// Cloud Function to delete users with unauthorized email domains
export const checkEmailDomain = functions.auth.user().onCreate(async (user: any) => {
  const userEmail = user.email || "";
  const emailDomain = userEmail.split("@")[1]?.toLowerCase();

  if (!ALLOWED_DOMAINS.includes(emailDomain)) {
    logger.info(`Deleting user with unauthorized domain: ${userEmail}`);
    await admin.auth().deleteUser(user.uid);
  } else {
    logger.info(`User authorized: ${userEmail}`);
  }
});
