// All Firebase Auth interactions used by the backend-owned login flow.
//
// Password verification is NOT available in the Admin SDK — it lives in the
// Identity Toolkit REST API, which we call with the public Web API key. Session
// creation/verification and all user management use the Admin SDK.

import { authAdmin } from '../config/firebase.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1';

function assertAuth() {
  if (!authAdmin) throw new ApiError(503, 'Firebase Auth is not configured on the server.');
  return authAdmin;
}

// Map Firebase REST error codes to friendly messages.
const SIGN_IN_ERRORS = {
  EMAIL_NOT_FOUND: 'No account found with that email.',
  INVALID_PASSWORD: 'Incorrect password.',
  INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password.',
  USER_DISABLED: 'This account has been disabled.',
  INVALID_EMAIL: 'Enter a valid email address.',
};

// Verify email/password against Firebase → returns { idToken, uid, email }.
export async function signInWithPassword(email, password) {
  if (!env.firebase.webApiKey) {
    throw new ApiError(503, 'FIREBASE_WEB_API_KEY is not set on the server.');
  }
  const res = await fetch(
    `${IDENTITY_TOOLKIT}/accounts:signInWithPassword?key=${env.firebase.webApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    const code = data?.error?.message?.split(' ')[0] || 'AUTH_ERROR';
    throw ApiError.unauthorized(SIGN_IN_ERRORS[code] || 'Login failed. Check your credentials.');
  }
  return { idToken: data.idToken, uid: data.localId, email: data.email };
}

// Trade a fresh ID token for a long-lived session cookie.
export async function createSessionCookie(idToken) {
  const expiresIn = env.firebase.sessionCookieDays * 24 * 60 * 60 * 1000;
  const cookie = await assertAuth().createSessionCookie(idToken, { expiresIn });
  return { cookie, expiresIn };
}

export async function verifySessionCookie(cookie) {
  try {
    return await assertAuth().verifySessionCookie(cookie, true);
  } catch {
    throw ApiError.unauthorized('Session expired or invalid. Please sign in again.');
  }
}

// ── User management (Admin SDK) ──
export async function createAuthUser({ email, password, displayName, disabled = false }) {
  try {
    return await assertAuth().createUser({ email, password, displayName, disabled });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw ApiError.conflict('An account with that email already exists.');
    }
    if (err.code === 'auth/invalid-password') {
      throw ApiError.badRequest('Password must be at least 6 characters.');
    }
    throw err;
  }
}

export async function updateAuthUser(uid, updates) {
  return assertAuth().updateUser(uid, updates);
}

export async function setUserRoleClaim(uid, role) {
  await assertAuth().setCustomUserClaims(uid, { role });
}

export async function revokeSessions(uid) {
  await assertAuth().revokeRefreshTokens(uid);
}

export async function generatePasswordResetLink(email) {
  return assertAuth().generatePasswordResetLink(email);
}
