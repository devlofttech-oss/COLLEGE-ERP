// Audit logging. Per spec §13, sensitive actions (login, fee collection, marks
// edit, result publish, archive/delete, user changes) must be recorded. Fire and
// forget — auditing must never break the main request.
//
// Tenant-scoped: writes to `institutions/{id}/auditLogs`. Actions taken outside a
// tenant context (e.g. a Devloft super-admin provisioning an institution) fall
// back to a global `systemAuditLogs` collection so nothing is ever lost.

import { db, admin } from '../config/firebase.js';
import { institutionCollection } from '../utils/firestore.js';
import { getInstitutionId } from '../utils/institutionContext.js';

export async function recordAudit({ action, entity, entityId, actor, meta } = {}) {
  if (!db) return;
  const institutionId = getInstitutionId();
  const entry = {
    action, // e.g. 'auth.login', 'fees.collect', 'results.publish'
    entity: entity || null,
    entityId: entityId || null,
    institutionId: institutionId || null,
    actorUid: actor?.uid || null,
    actorEmail: actor?.email || null,
    actorRole: actor?.role || null,
    meta: meta || null,
    at: admin.firestore.FieldValue.serverTimestamp(),
  };
  try {
    const target = institutionId
      ? institutionCollection('auditLogs')
      : db.collection('systemAuditLogs');
    await target.add(entry);
  } catch (err) {
    console.error('[audit] failed to record', action, err.message);
  }
}
