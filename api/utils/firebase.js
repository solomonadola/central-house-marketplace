import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Verifying ID tokens only needs the project ID: firebase-admin checks the
// signature against Google's public keys, so no service account is required.
const app =
  getApps()[0] ||
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'centralhousemarketplace',
  });

export const verifyFirebaseIdToken = (idToken) => getAuth(app).verifyIdToken(idToken);
