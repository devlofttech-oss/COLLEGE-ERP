// Audit logging. Per spec §13, sensitive actions (login, fee collection, marks
// edit, result publish, archive/delete, user changes) must be recorded. Fire and
// forget — auditing must never break the main request.

import { db, admin } from '../config/firebase.js';

const COLLECTION = 'auditLogs';

export async function recordAudit({ action, entity, entityId, actor, meta } = {}) {
  if (!db) return;
  try {
    await db.collection(COLLECTION).add({
      action, // e.g. 'auth.login', 'fees.collect', 'results.publish'
      entity: entity || null, // e.g. 'student', 'fee', 'user'
      entityId: entityId || null,
      actorUid: actor?.uid || null,
      actorEmail: actor?.email || null,
      actorRole: actor?.role || null,
      meta: meta || null,
      at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[audit] failed to record', action, err.message);
  }
}
