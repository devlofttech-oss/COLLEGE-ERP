// Generic Firestore helpers shared by all modules. Centralizes timestamps,
// soft-delete/archive convention, and common list/get/create/update logic so
// each module's service stays small.
//
// MULTI-TENANCY: tenant data lives in subcollections
// `institutions/{institutionId}/{collection}`. The active institutionId comes
// from the per-request AsyncLocalStorage context (see institutionContext.js), so
// services don't thread it through their signatures. GLOBAL_COLLECTIONS stay at
// the root. Isolation is enforced by the path — a cross-tenant doc simply isn't
// found.

import { db, admin } from '../config/firebase.js';
import { ApiError } from './ApiError.js';
import { getInstitutionId } from './institutionContext.js';

const now = () => admin.firestore.FieldValue.serverTimestamp();

// Collections that are NOT tenant-scoped (live at the Firestore root).
export const GLOBAL_COLLECTIONS = new Set(['users', 'institutions']);

function assertDb() {
  if (!db) throw new ApiError(503, 'Firestore is not configured on the server.');
  return db;
}

// Resolve a collection reference for the current request's tenant context.
function collectionRef(collectionName) {
  const database = assertDb();
  if (GLOBAL_COLLECTIONS.has(collectionName)) return database.collection(collectionName);
  const institutionId = getInstitutionId();
  if (!institutionId) {
    throw new ApiError(400, `No institution context for "${collectionName}". A tenant must be selected for this operation.`);
  }
  return database.collection('institutions').doc(institutionId).collection(collectionName);
}

// ALS-aware tenant collection ref (for direct/batch usage in services).
export function institutionCollection(collectionName) {
  return collectionRef(collectionName);
}

// Explicitly-targeted tenant collection ref — for provisioning and cross-tenant
// work where the ambient context is null or a different institution.
export function institutionCollectionFor(institutionId, collectionName) {
  const database = assertDb();
  if (GLOBAL_COLLECTIONS.has(collectionName)) return database.collection(collectionName);
  if (!institutionId) throw ApiError.badRequest('institutionId is required.');
  return database.collection('institutions').doc(institutionId).collection(collectionName);
}

// Normalize a Firestore doc snapshot to a plain object with id.
export function docToObject(doc) {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// In-memory predicate for non-equality filters (kept out of the Firestore query
// so we never require composite indexes).
function matchesFilter(op, actual, value) {
  switch (op) {
    case 'in': return Array.isArray(value) && value.includes(actual);
    case 'not-in': return Array.isArray(value) && !value.includes(actual);
    case '!=': return actual !== value;
    case '>': return actual > value;
    case '>=': return actual >= value;
    case '<': return actual < value;
    case '<=': return actual <= value;
    case 'array-contains': return Array.isArray(actual) && actual.includes(value);
    default: return actual === value;
  }
}

function compareBy(field, direction) {
  const dir = direction === 'desc' ? -1 : 1;
  return (a, b) => {
    const av = a[field]; const bv = b[field];
    if (av === bv) return 0;
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return (av < bv ? -1 : 1) * dir;
  };
}

export const repo = (collectionName) => {
  // Resolve lazily at call time — NEVER at module import — so the tenant binds
  // per-request, not once at startup.
  const col = () => collectionRef(collectionName);

  return {
    collection: col,

    // Only equality (`==`) filters go to Firestore; everything else (in, ranges,
    // ordering, limit) is applied in memory. This keeps every list query on the
    // automatic single-field indexes — no composite indexes to manage per tenant.
    async list({ where = [], orderBy, limit, includeArchived = false } = {}) {
      let q = col();
      const memFilters = [];
      for (const [field, op, value] of where) {
        if (op === '==') q = q.where(field, op, value);
        else memFilters.push([field, op, value]);
      }
      if (!includeArchived) q = q.where('archived', '==', false);

      const snap = await q.get();
      let items = snap.docs.map(docToObject);

      for (const [field, op, value] of memFilters) {
        items = items.filter((it) => matchesFilter(op, it[field], value));
      }
      if (orderBy) items.sort(compareBy(orderBy.field, orderBy.direction));
      if (limit) items = items.slice(0, limit);
      return items;
    },

    async getById(id) {
      const doc = await col().doc(id).get();
      return docToObject(doc);
    },

    async getByIdOrFail(id) {
      const found = await this.getById(id);
      if (!found) throw ApiError.notFound(`${collectionName} record not found: ${id}`);
      return found;
    },

    async create(data, { actor } = {}) {
      const payload = {
        archived: false,
        ...data,
        createdAt: now(),
        updatedAt: now(),
        createdBy: actor?.uid || null,
        updatedBy: actor?.uid || null,
      };
      const ref = await col().add(payload);
      return this.getById(ref.id);
    },

    // Create with a caller-supplied id (upsert semantics via set/merge).
    async createWithId(id, data, { actor, merge = false } = {}) {
      const payload = {
        ...(merge ? {} : { archived: false }),
        ...data,
        updatedAt: now(),
        updatedBy: actor?.uid || null,
      };
      if (!merge) {
        payload.createdAt = now();
        payload.createdBy = actor?.uid || null;
      }
      await col().doc(id).set(payload, { merge });
      return this.getById(id);
    },

    async update(id, data, { actor } = {}) {
      await this.getByIdOrFail(id); // also enforces tenant ownership via path
      const payload = { ...data, updatedAt: now(), updatedBy: actor?.uid || null };
      // Never allow these to be overwritten by client input.
      delete payload.id;
      delete payload.createdAt;
      delete payload.createdBy;
      await col().doc(id).update(payload);
      return this.getById(id);
    },

    // Soft delete / archive — the doc guidance requires archive over hard delete.
    async archive(id, { actor } = {}) {
      await this.getByIdOrFail(id);
      await col().doc(id).update({
        archived: true,
        archivedAt: now(),
        archivedBy: actor?.uid || null,
        updatedAt: now(),
      });
      return this.getById(id);
    },

    async restore(id, { actor } = {}) {
      await this.getByIdOrFail(id);
      await col().doc(id).update({
        archived: false,
        archivedAt: null,
        archivedBy: null,
        updatedAt: now(),
        updatedBy: actor?.uid || null,
      });
      return this.getById(id);
    },
  };
};

export { now as serverTimestamp };
