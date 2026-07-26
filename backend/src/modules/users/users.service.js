// User management. A user is a Firebase Auth account + a Firestore profile in the
// `users` collection whose doc id === Firebase uid. The profile carries the ERP
// role, status and display fields.

import {
  createAuthUser,
  updateAuthUser,
  setUserRoleClaim,
  revokeSessions,
} from '../../services/firebaseAuth.service.js';
import { repo } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';
import { isValidRole } from '../../config/permissions.js';

const usersRepo = repo('users');

export async function listUsers({ includeArchived = false } = {}) {
  return usersRepo.list({ includeArchived, orderBy: { field: 'createdAt', direction: 'desc' } });
}

export async function getUser(uid) {
  return usersRepo.getByIdOrFail(uid);
}

export async function createUser({ email, password, name, role, phone, status = 'active', linkedStudentIds }, actor) {
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');
  if (!role || !isValidRole(role)) throw ApiError.badRequest('A valid role is required.');

  // 1. Firebase Auth account
  const authUser = await createAuthUser({ email, password, displayName: name });
  // 2. Role claim (so tokens/session carry the role too)
  await setUserRoleClaim(authUser.uid, role);
  // 3. Firestore profile keyed by uid. linkedStudentIds links a parent/student
  //    login to the student record(s) they may view in the mobile app.
  const profile = await usersRepo.createWithId(
    authUser.uid,
    {
      email, name: name || null, role, phone: phone || null, status,
      linkedStudentIds: Array.isArray(linkedStudentIds) ? linkedStudentIds : [],
    },
    { actor },
  );
  return profile;
}

// Link a parent/student login to one or more student records (mobile self-view).
export async function setLinkedStudents(uid, studentIds, actor) {
  if (!Array.isArray(studentIds)) throw ApiError.badRequest('studentIds must be an array.');
  await usersRepo.getByIdOrFail(uid);
  return usersRepo.update(uid, { linkedStudentIds: studentIds }, { actor });
}

export async function updateUser(uid, { name, phone, status }, actor) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (status !== undefined) updates.status = status;

  const profile = await usersRepo.update(uid, updates, { actor });
  if (name !== undefined) await updateAuthUser(uid, { displayName: name });
  if (status !== undefined && status !== 'active') await revokeSessions(uid);
  return profile;
}

export async function changeUserRole(uid, role, actor) {
  if (!isValidRole(role)) throw ApiError.badRequest('A valid role is required.');
  await usersRepo.getByIdOrFail(uid);
  await setUserRoleClaim(uid, role);
  return usersRepo.update(uid, { role }, { actor });
}

export async function archiveUser(uid, actor) {
  await updateAuthUser(uid, { disabled: true });
  await revokeSessions(uid);
  return usersRepo.archive(uid, { actor });
}

export async function restoreUser(uid, actor) {
  await updateAuthUser(uid, { disabled: false });
  return usersRepo.restore(uid, { actor });
}
