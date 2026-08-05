// User management. A user is a Firebase Auth account + a Firestore profile in the
// GLOBAL `users` collection (doc id === Firebase uid). The profile carries the ERP
// role, status, display fields, and — for multi-tenancy — an `institutionId`
// (null for Devloft super-admins).
//
// Because `users` is global (not tenant-scoped by the repo), tenant isolation is
// enforced HERE with explicit institutionId filters/guards.

import {
  createAuthUser,
  updateAuthUser,
  setUserRoleClaim,
  revokeSessions,
} from '../../services/firebaseAuth.service.js';
import { repo } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';
import { isValidRole, ROLES } from '../../config/permissions.js';

const usersRepo = repo('users');

// Guard: a caller scoped to institutionId may only touch users in that tenant.
async function loadInTenant(uid, institutionId) {
  const user = await usersRepo.getByIdOrFail(uid);
  if (institutionId && user.institutionId !== institutionId) {
    throw ApiError.notFound(`User not found: ${uid}`);
  }
  return user;
}

export async function listUsers({ includeArchived = false, institutionId } = {}) {
  const where = institutionId ? [['institutionId', '==', institutionId]] : [];
  return usersRepo.list({ where, includeArchived, orderBy: { field: 'createdAt', direction: 'desc' } });
}

export async function getUser(uid, institutionId) {
  return loadInTenant(uid, institutionId);
}

// institutionId is EXPLICIT (super-admin provisioning creates users in a tenant
// other than their own null context). Pass null only for another super-admin.
export async function createUser({ email, password, name, role, phone, status = 'active', linkedStudentIds, institutionId }, actor) {
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');
  if (!role || !isValidRole(role)) throw ApiError.badRequest('A valid role is required.');
  if (role !== ROLES.SUPER_ADMIN && !institutionId) {
    throw ApiError.badRequest('An institution is required for non-super-admin users.');
  }

  // 1. Firebase Auth account
  const authUser = await createAuthUser({ email, password, displayName: name });
  // 2. Role + institution claims (carried in the ID token / future client rules)
  await setUserRoleClaim(authUser.uid, role, institutionId || null);
  // 3. Firestore profile keyed by uid
  const profile = await usersRepo.createWithId(
    authUser.uid,
    {
      email,
      name: name || null,
      role,
      phone: phone || null,
      status,
      institutionId: institutionId || null,
      linkedStudentIds: Array.isArray(linkedStudentIds) ? linkedStudentIds : [],
    },
    { actor },
  );
  return profile;
}

export async function updateUser(uid, { name, phone, status }, actor, institutionId) {
  await loadInTenant(uid, institutionId);
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;

  const profile = await usersRepo.update(uid, updates, { actor });
  if (name !== undefined) await updateAuthUser(uid, { displayName: name });
  if (status !== undefined && status !== 'active') await revokeSessions(uid);
  return profile;
}

export async function changeUserRole(uid, role, actor, institutionId) {
  if (!isValidRole(role)) throw ApiError.badRequest('A valid role is required.');
  const user = await loadInTenant(uid, institutionId);
  await setUserRoleClaim(uid, role, user.institutionId || null);
  return usersRepo.update(uid, { role }, { actor });
}

export async function archiveUser(uid, actor, institutionId) {
  await loadInTenant(uid, institutionId);
  await updateAuthUser(uid, { disabled: true });
  await revokeSessions(uid);
  return usersRepo.archive(uid, { actor });
}

export async function restoreUser(uid, actor, institutionId) {
  await loadInTenant(uid, institutionId);
  await updateAuthUser(uid, { disabled: false });
  return usersRepo.restore(uid, { actor });
}

// Link a parent/student login to one or more student records (mobile self-view).
export async function setLinkedStudents(uid, studentIds, actor, institutionId) {
  if (!Array.isArray(studentIds)) throw ApiError.badRequest('studentIds must be an array.');
  await loadInTenant(uid, institutionId);
  return usersRepo.update(uid, { linkedStudentIds: studentIds }, { actor });
}
