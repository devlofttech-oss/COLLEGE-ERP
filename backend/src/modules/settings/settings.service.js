// Settings (Spec §7.12): institution profile, branding, integrations config and
// backup settings. Stored as fixed docs in the `settings` collection. Integration
// secrets are write-through but masked on read.

import { db, admin } from '../../config/firebase.js';
import { pick } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';

const COLLECTION = 'settings';

function assertDb() {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  return db;
}

async function getDoc(id, fallback = {}) {
  const snap = await assertDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? snap.data() : fallback;
}

async function setDoc(id, data, actor) {
  await assertDb().collection(COLLECTION).doc(id).set({
    ...data,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: actor?.uid || null,
  }, { merge: true });
  return getDoc(id);
}

// ── Institution profile ──
export const getInstitution = () => getDoc('institution', {});
export async function updateInstitution(data, actor) {
  const payload = pick(data, ['name', 'address', 'phone', 'email', 'website', 'academicYear', 'affiliation', 'registrationNumber']);
  const result = await setDoc('institution', payload, actor);
  recordAudit({ action: 'settings.updateInstitution', entity: 'settings', entityId: 'institution', actor });
  return result;
}

// ── Branding ──
export const getBranding = () => getDoc('branding', {});
export const updateBranding = (data, actor) =>
  setDoc('branding', pick(data, ['logoKey', 'logoUrl', 'primaryColor', 'secondaryColor', 'theme', 'receiptHeader', 'reportCardTemplate', 'idCardTemplate']), actor);

// ── Integrations (secrets masked on read) ──
const SECRET_FIELDS = ['smsApiKey', 'whatsappApiKey', 'emailApiKey', 'paymentKeyId', 'paymentKeySecret', 'fcmServerKey'];

function maskSecrets(obj) {
  const out = { ...obj };
  for (const f of SECRET_FIELDS) {
    if (out[f]) out[f] = `••••${String(out[f]).slice(-4)}`;
    out[`${f}Set`] = Boolean(obj[f]);
  }
  return out;
}

export async function getIntegrations() {
  return maskSecrets(await getDoc('integrations', {}));
}
export async function updateIntegrations(data, actor) {
  // Only write provided fields; empty string clears a secret.
  const payload = pick(data, [
    ...SECRET_FIELDS, 'smsSenderId', 'smsProvider', 'whatsappProvider',
    'emailProvider', 'emailFrom', 'paymentProvider', 'storageProvider',
  ]);
  await setDoc('integrations', payload, actor);
  recordAudit({ action: 'settings.updateIntegrations', entity: 'settings', entityId: 'integrations', actor });
  return getIntegrations();
}

// ── Backup settings ──
export const getBackupSettings = () => getDoc('backup', { schedule: 'daily', retentionDays: 7 });
export const updateBackupSettings = (data, actor) =>
  setDoc('backup', pick(data, ['schedule', 'retentionDays', 'externalTarget', 'lastBackupAt']), actor);
