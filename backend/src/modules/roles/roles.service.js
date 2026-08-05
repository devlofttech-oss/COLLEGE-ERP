// Role + permission resolution. Defaults come from config/permissions.js; each
// institution can override a role's permission set at runtime, stored per-tenant
// in `institutions/{id}/rolePermissions/{role}`. Overrides fully replace the
// default set for that role when present.
//
// institutionId is passed EXPLICITLY (not via ALS) because resolvePermissions
// runs during auth, before the request's institution context is established.

import {
  ROLE_LIST,
  ALL_PERMISSIONS,
  PERMISSIONS,
  defaultPermissionsForRole,
  isValidRole,
} from '../../config/permissions.js';
import { institutionCollectionFor } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';

const OVERRIDE_COLLECTION = 'rolePermissions';

async function getOverride(role, institutionId) {
  if (!institutionId) return null; // super-admin / no tenant → defaults only
  const doc = await institutionCollectionFor(institutionId, OVERRIDE_COLLECTION).doc(role).get();
  return doc.exists ? doc.data() : null;
}

// The effective permission list for a role in a given institution.
export async function resolvePermissionsForRole(role, institutionId = null) {
  if (!role || !isValidRole(role)) return [];
  const override = await getOverride(role, institutionId);
  if (override?.permissions && Array.isArray(override.permissions)) {
    return override.permissions;
  }
  return defaultPermissionsForRole(role);
}

// All roles with their effective permissions + the default (for the UI editor).
export async function listRolesWithPermissions(institutionId = null) {
  return Promise.all(
    ROLE_LIST.map(async (role) => ({
      ...role,
      permissions: await resolvePermissionsForRole(role.id, institutionId),
      defaultPermissions: defaultPermissionsForRole(role.id),
    })),
  );
}

export function getPermissionCatalog() {
  return { groups: PERMISSIONS, all: ALL_PERMISSIONS };
}

// Persist a permission-set override for a role in an institution.
export async function setRolePermissions(role, permissions, actor, institutionId) {
  if (!institutionId) throw ApiError.badRequest('An institution must be selected to edit role permissions.');
  if (!isValidRole(role)) throw ApiError.badRequest(`Unknown role: ${role}`);
  if (!Array.isArray(permissions)) throw ApiError.badRequest('permissions must be an array.');

  const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalid.length) {
    throw ApiError.badRequest(`Unknown permissions: ${invalid.join(', ')}`);
  }

  await institutionCollectionFor(institutionId, OVERRIDE_COLLECTION).doc(role).set({
    role,
    permissions,
    updatedBy: actor?.uid || null,
    updatedAt: new Date().toISOString(),
  });
  return resolvePermissionsForRole(role, institutionId);
}

// Reset a role to its default permission set (remove the override).
export async function resetRolePermissions(role, institutionId) {
  if (!institutionId) throw ApiError.badRequest('An institution must be selected.');
  if (!isValidRole(role)) throw ApiError.badRequest(`Unknown role: ${role}`);
  await institutionCollectionFor(institutionId, OVERRIDE_COLLECTION).doc(role).delete();
  return defaultPermissionsForRole(role);
}
