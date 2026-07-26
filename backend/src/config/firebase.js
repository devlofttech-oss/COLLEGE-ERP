// Firebase Admin SDK initialization (Firestore + Auth).
// Credentials come from either the FIREBASE_SERVICE_ACCOUNT env var (JSON string)
// or a local backend/serviceAccountKey.json file (gitignored) for development.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import admin from 'firebase-admin';
import { env } from './env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_KEY_PATH = join(__dirname, '..', '..', 'serviceAccountKey.json');

function loadServiceAccount() {
  if (env.firebase.serviceAccount) {
    try {
      return JSON.parse(env.firebase.serviceAccount);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON.');
    }
  }
  if (existsSync(LOCAL_KEY_PATH)) {
    return JSON.parse(readFileSync(LOCAL_KEY_PATH, 'utf8'));
  }
  return null;
}

let app = null;

function init() {
  if (admin.apps.length) return admin.apps[0];
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn(
      '[firebase] No service account found. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json. Firestore/Auth calls will fail until configured.',
    );
    return null;
  }
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

app = init();

export const firebaseReady = Boolean(app);
export const db = app ? admin.firestore() : null;
export const authAdmin = app ? admin.auth() : null;
export { admin };
