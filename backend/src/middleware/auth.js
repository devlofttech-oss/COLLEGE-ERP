// requireAuth: verifies the session cookie, loads the user's ERP profile + role,
// and attaches req.user = { uid, email, role, permissions, profile }.

import { verifySessionCookie } from '../services/firebaseAuth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { repo } from '../utils/firestore.js';
import { resolvePermissionsForRole } from '../modules/roles/roles.service.js';

export const SESSION_COOKIE_NAME = 'session';

const usersRepo = repo('users');

export const requireAuth = asyncHandler(async (req, res, next) => {
  const cookie = req.cookies?.[SESSION_COOKIE_NAME];
  if (!cookie) throw ApiError.unauthorized('Not signed in.');

  const decoded = await verifySessionCookie(cookie);

  // Load the ERP profile keyed by Firebase uid.
  const profile = await usersRepo.getById(decoded.uid);
  if (profile?.archived) throw ApiError.forbidden('This account has been deactivated.');
  if (profile?.status && profile.status !== 'active') {
    throw ApiError.forbidden('This account is not active.');
  }

  const role = profile?.role || decoded.role || null;
  const permissions = await resolvePermissionsForRole(role);

  req.user = {
    uid: decoded.uid,
    email: decoded.email || profile?.email || null,
    role,
    permissions,
    profile: profile || null,
  };
  next();
});
