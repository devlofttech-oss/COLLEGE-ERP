// Role + permission resolution. Defaults come from config/permissions.js; admins
// can override a role's permission set at runtime, stored per-role in the
// `rolePermissions` collection (doc id === role id). Overrides fully replace the
// default set for that role when present.

import { db } from '../../config/firebase.js';
import {
  ROLE_LIST,
  ALL_PERMISSIONS,
  PERMISSIONS,
  defaultPermissionsForRole,
  isValidRole,
} from '../../config/permissions.js';
import { ApiError } from '../../utils/ApiError.js';

const OVERRIDE_COLLECTION = 'rolePermissions';

async function getOverride(role) {
  if (!db) return null;
  const doc = await db.collection(OVERRIDE_COLLECTION).doc(role).get();
  return doc.exists ? doc.data() : null;
}

// The effective permission list for a role (override if present, else default).
export async function resolvePermissionsForRole(role) {
  if (!role || !isValidRole(role)) return [];
  const override = await getOverride(role);
  if (override?.permissions && Array.isArray(override.permissions)) {
    return override.permissions;
  }
  return defaultPermissionsForRole(role);
}

// All roles with their effective permissions + the default (for the UI editor).
export async function listRolesWithPermissions() {
  return Promise.all(
    ROLE_LIST.map(async (role) => ({
      ...role,
      permissions: await resolvePermissionsForRole(role.id),
      defaultPermissions: defaultPermissionsForRole(role.id),
    })),
  );
}

export function getPermissionCatalog() {
  return { groups: PERMISSIONS, all: ALL_PERMISSIONS };
}

// Persist a permission-set override for a role (super-admin / admin only).
export async function setRolePermissions(role, permissions, actor) {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  if (!isValidRole(role)) throw ApiError.badRequest(`Unknown role: ${role}`);
  if (!Array.isArray(permissions)) throw ApiError.badRequest('permissions must be an array.');

  const invalid = permissions.filter((p) => !ALL_PERMISSIONS.includes(p));
  if (invalid.length) {
    throw ApiError.badRequest(`Unknown permissions: ${invalid.join(', ')}`);
  }

  await db.collection(OVERRIDE_COLLECTION).doc(role).set({
    role,
    permissions,
    updatedBy: actor?.uid || null,
    updatedAt: new Date().toISOString(),
  });
  return resolvePermissionsForRole(role);
}

// Reset a role to its default permission set.
export async function resetRolePermissions(role) {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  if (!isValidRole(role)) throw ApiError.badRequest(`Unknown role: ${role}`);
  await db.collection(OVERRIDE_COLLECTION).doc(role).delete();
  return defaultPermissionsForRole(role);
}
