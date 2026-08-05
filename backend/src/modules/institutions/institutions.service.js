// Institutions (tenants) — Devloft super-admin only. Operates on the GLOBAL
// `institutions` collection: provision a college, set its enabled modules and
// feature flags, and create its first admin login. Seeds the tenant's own
// settings subcollection via institutionCollectionFor (explicit target, since the
// super-admin's own ALS context is null during provisioning).

import { admin } from '../../config/firebase.js';
import { repo, institutionCollectionFor } from '../../utils/firestore.js';
import { pick, requireFields } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';
import { createUser } from '../users/users.service.js';
import { STANDARD_MODULES, isKnownModule } from '../../config/modules.js';

const institutions = repo('institutions');

const STATUSES = ['active', 'suspended', 'setup'];

export const listInstitutions = () =>
  institutions.list({ includeArchived: true, orderBy: { field: 'name' } });

export const getInstitution = (id) => institutions.getByIdOrFail(id);

export async function createInstitution(body, actor) {
  requireFields(body, ['name']);
  const data = pick(body, ['name', 'slug', 'status', 'enabledModules', 'featureFlags', 'branding', 'plan', 'contactEmail', 'contactPhone']);
  data.status = STATUSES.includes(data.status) ? data.status : 'active';
  data.enabledModules = Array.isArray(data.enabledModules) && data.enabledModules.length
    ? data.enabledModules.filter(isKnownModule)
    : [...STANDARD_MODULES];
  data.featureFlags = data.featureFlags || {};
  data.branding = data.branding || {};

  const inst = await institutions.create(data, { actor });

  // Seed the tenant's institution-profile settings doc.
  await institutionCollectionFor(inst.id, 'settings').doc('institution').set(
    { name: inst.name, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true },
  );

  // Optionally create the institution's first admin login.
  let adminUser = null;
  if (body.admin?.email && body.admin?.password) {
    adminUser = await createUser({
      email: body.admin.email,
      password: body.admin.password,
      name: body.admin.name || 'Institution Admin',
      role: 'admin',
      institutionId: inst.id,
    }, actor);
  }

  recordAudit({ action: 'institutions.create', entity: 'institution', entityId: inst.id, actor, meta: { name: inst.name } });
  return { institution: inst, admin: adminUser };
}

export const updateInstitution = (id, body, actor) =>
  institutions.update(id, pick(body, ['name', 'slug', 'status', 'branding', 'plan', 'contactEmail', 'contactPhone']), { actor });

export async function setModules(id, enabledModules, actor) {
  if (!Array.isArray(enabledModules)) throw ApiError.badRequest('enabledModules must be an array.');
  const unknown = enabledModules.filter((m) => !isKnownModule(m));
  if (unknown.length) throw ApiError.badRequest(`Unknown module(s): ${unknown.join(', ')}`);
  const inst = await institutions.update(id, { enabledModules }, { actor });
  recordAudit({ action: 'institutions.setModules', entity: 'institution', entityId: id, actor, meta: { enabledModules } });
  return inst;
}

export async function setFeatures(id, featureFlags, actor) {
  if (typeof featureFlags !== 'object' || featureFlags === null || Array.isArray(featureFlags)) {
    throw ApiError.badRequest('featureFlags must be an object.');
  }
  const inst = await institutions.update(id, { featureFlags }, { actor });
  recordAudit({ action: 'institutions.setFeatures', entity: 'institution', entityId: id, actor });
  return inst;
}
