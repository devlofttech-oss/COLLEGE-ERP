// Backend-owned login. The frontend posts credentials here; the backend verifies
// them with Firebase, mints a session cookie, and returns the user's profile +
// effective permissions. The frontend never touches Firebase directly.

import {
  signInWithPassword,
  createSessionCookie,
  revokeSessions,
  generatePasswordResetLink,
} from '../../services/firebaseAuth.service.js';
import { resolvePermissionsForRole } from '../roles/roles.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { repo } from '../../utils/firestore.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { env } from '../../config/env.js';
import { SESSION_COOKIE_NAME } from '../../middleware/auth.js';

const usersRepo = repo('users');

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProd, // HTTPS only in production
    sameSite: env.isProd ? 'none' : 'lax', // cross-site (separate frontend domain) in prod
    maxAge: maxAgeMs,
    path: '/',
  };
}

function publicUser(uid, email, profile, permissions) {
  return {
    uid,
    email,
    role: profile?.role || null,
    status: profile?.status || 'active',
    name: profile?.name || profile?.displayName || null,
    permissions,
    profile: profile || null,
  };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');

  const { idToken, uid, email: verifiedEmail } = await signInWithPassword(email, password);

  const profile = await usersRepo.getById(uid);
  if (profile?.archived || (profile?.status && profile.status !== 'active')) {
    throw ApiError.forbidden('This account is not active. Contact your administrator.');
  }

  const { cookie, expiresIn } = await createSessionCookie(idToken);
  res.cookie(SESSION_COOKIE_NAME, cookie, cookieOptions(expiresIn));

  const permissions = await resolvePermissionsForRole(profile?.role);
  recordAudit({ action: 'auth.login', entity: 'user', entityId: uid, actor: { uid, email: verifiedEmail, role: profile?.role } });

  res.json({ user: publicUser(uid, verifiedEmail, profile, permissions) });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { ...cookieOptions(0), maxAge: undefined });
  res.json({ ok: true });
});

// Current session — requireAuth has already populated req.user.
export const me = asyncHandler(async (req, res) => {
  const { uid, email, role, permissions, profile } = req.user;
  res.json({ user: publicUser(uid, email, profile, permissions) });
});

// Revoke all sessions for the current user (e.g. "sign out everywhere").
export const logoutEverywhere = asyncHandler(async (req, res) => {
  await revokeSessions(req.user.uid);
  res.clearCookie(SESSION_COOKIE_NAME, { ...cookieOptions(0), maxAge: undefined });
  res.json({ ok: true });
});

// Generate a password reset link. Emailing it is an integration concern; for now
// we generate it (and log in dev) so the flow is wired end-to-end.
export const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw ApiError.badRequest('Email is required.');
  try {
    const link = await generatePasswordResetLink(email);
    if (!env.isProd) console.log(`[auth] password reset link for ${email}: ${link}`);
  } catch {
    // Do not reveal whether the email exists.
  }
  res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
});
