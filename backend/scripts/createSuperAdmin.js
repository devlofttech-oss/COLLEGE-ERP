// One-time bootstrap: create (or update) a Devloft super-admin login.
// Usage:  node scripts/createSuperAdmin.js <email> <password> [name]
//
// A super-admin is cross-tenant (institutionId = null). After this, log in via
// the API and use POST /api/institutions to provision colleges.

import 'dotenv/config';
import { authAdmin, db, firebaseReady } from '../src/config/firebase.js';
import { admin } from '../src/config/firebase.js';

const [email, password, name = 'Super Admin'] = process.argv.slice(2);

if (!firebaseReady) {
  console.error('Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT or add serviceAccountKey.json.');
  process.exit(1);
}
if (!email || !password) {
  console.error('Usage: node scripts/createSuperAdmin.js <email> <password> [name]');
  process.exit(1);
}

async function run() {
  let user;
  try {
    user = await authAdmin.getUserByEmail(email);
    await authAdmin.updateUser(user.uid, { password, displayName: name });
    console.log(`Updated existing auth user: ${user.uid}`);
  } catch {
    user = await authAdmin.createUser({ email, password, displayName: name });
    console.log(`Created auth user: ${user.uid}`);
  }

  await authAdmin.setCustomUserClaims(user.uid, { role: 'super-admin', institutionId: null });

  await db.collection('users').doc(user.uid).set({
    email,
    name,
    role: 'super-admin',
    status: 'active',
    institutionId: null,
    linkedStudentIds: [],
    archived: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`✓ Super-admin ready: ${email}`);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
