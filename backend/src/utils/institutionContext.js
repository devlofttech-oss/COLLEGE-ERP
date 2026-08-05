// Per-request institution (tenant) context via AsyncLocalStorage.
//
// A middleware sets the current institutionId for the lifetime of a request, and
// the Firestore helpers read it lazily to resolve the right tenant subcollection
// — so services never have to thread institutionId through their call signatures.
//
// Kept in its own file (no imports from firestore.js) to avoid circular deps.

import { AsyncLocalStorage } from 'node:async_hooks';

const storage = new AsyncLocalStorage();

// Run `fn` with the given store bound as the active context. Use `.run` (NOT
// `.enterWith`) so sibling requests on the same tick can never bleed into each
// other.
export function runWithInstitution(store, fn) {
  return storage.run(store, fn);
}

// The active institutionId, or null when outside any institution context
// (e.g. login, health, or a Devloft super-admin cross-tenant call).
export function getInstitutionId() {
  return storage.getStore()?.institutionId ?? null;
}

// Full active store (institutionId + featureFlags + any extras).
export function getInstitutionContext() {
  return storage.getStore() ?? null;
}

// Per-institution feature flags, so any service can branch on CONFIG (never on a
// hardcoded institution id) to customize behavior for a specific college.
export function getFeatureFlags() {
  return storage.getStore()?.featureFlags ?? {};
}

export function getFeatureFlag(key, fallback = undefined) {
  const flags = storage.getStore()?.featureFlags;
  return flags && key in flags ? flags[key] : fallback;
}
