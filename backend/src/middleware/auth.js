// requireAuth: verifies the session cookie, loads the user's ERP profile + role,
// resolves the request's institution (tenant) context, and attaches:
//   req.user        = { uid, email, role, permissions, profile }
//   req.institutionId = string | null
//   req.institution   = { id, ...doc } | undefined
//
// Tenant resolution is folded in here (rather than a separate middleware) so every
// router that already does `router.use(requireAuth)` gets tenant context for free.
// The rest of the request runs inside the AsyncLocalStorage institution context,
// so repo()/institutionCollection() resolve the right tenant subcollection.

import { verifySessionCookie } from '../services/firebaseAuth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { repo, docToObject } from '../utils/firestore.js';
import { resolvePermissionsForRole } from '../modules/roles/roles.service.js';
import { runWithInstitution } from '../utils/institutionContext.js';
import { db } from '../config/firebase.js';
import { ROLES } from '../config/permissions.js';

export const SESSION_COOKIE_NAME = 'session';
export const INSTITUTION_HEADER = 'x-institution-id';

const usersRepo = repo('users');

// Resolve which institution this request operates on.
//  - super-admin (Devloft): cross-tenant; may target a tenant via the header.
//  - everyone else: locked to their profile's institutionId.
function resolveInstitutionId(role, profile, req) {
  if (role === ROLES.SUPER_ADMIN) {
    return req.get(INSTITUTION_HEADER) || null; // optional; null = cross-tenant
  }
  const id = profile?.institutionId || null;
  if (!id) throw ApiError.forbidden('Your account is not linked to an institution.');
  return id;
}

async function loadInstitution(institutionId, role) {
  const snap = await db.collection('institutions').doc(institutionId).get();
  const inst = docToObject(snap);
  if (!inst) throw ApiError.notFound('Institution not found.');
  if (inst.status && inst.status !== 'active' && role !== ROLES.SUPER_ADMIN) {
    throw ApiError.forbidden('This institution is currently suspended.');
  }
  return inst;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (!cookie) throw ApiError.unauthorized('Not signed in.');

  const decoded = await verifySessionCookie(cookie);

  // users is a GLOBAL collection, so this read needs no tenant context.
  const profile = await usersRepo.getById(decoded.uid);
  if (profile?.archived) throw ApiError.forbidden('This account has been deactivated.');
  if (profile?.status && profile.status !== 'active') {
    throw ApiError.forbidden('This account is not active.');
  }

  const role = profile?.role || decoded.role || null;
  const institutionId = resolveInstitutionId(role, profile, req);
  const permissions = await resolvePermissionsForRole(role, institutionId);

  req.user = {
    uid: decoded.uid,
    email: decoded.email || profile?.email || null,
    role,
    permissions,
    profile: profile || null,
  };
  req.institutionId = institutionId;

  if (institutionId) {
    req.institution = await loadInstitution(institutionId, role);
  }

  // Bind the tenant context (id + feature flags) for the remainder of the request
  // so services can branch on per-college config without threading req around.
  runWithInstitution(
    { institutionId, featureFlags: req.institution?.featureFlags || {} },
    () => next(),
  );
});
