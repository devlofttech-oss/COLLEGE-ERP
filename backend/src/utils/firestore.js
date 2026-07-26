// Generic Firestore helpers shared by all modules. Centralizes timestamps,
// soft-delete/archive convention, and common list/get/create/update logic so
// each module's service stays small.

import { db, admin } from '../config/firebase.js';
import { ApiError } from './ApiError.js';

const now = () => admin.firestore.FieldValue.serverTimestamp();

function assertDb() {
  if (!db) throw new ApiError(503, 'Firestore is not configured on the server.');
  return db;
}

// Normalize a Firestore doc snapshot to a plain object with id.
export function docToObject(doc) {
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export const repo = (collectionName) => {
  const col = () => assertDb().collection(collectionName);

  return {
    collection: col,

    async list({ where = [], orderBy, limit, includeArchived = false } = {}) {
      let q = col();
      for (const [field, op, value] of where) q = q.where(field, op, value);
      if (!includeArchived) q = q.where('archived', '==', false);
      if (orderBy) q = q.orderBy(orderBy.field, orderBy.direction || 'asc');
      if (limit) q = q.limit(limit);
      const snap = await q.get();
      return snap.docs.map(docToObject);
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
      await this.getByIdOrFail(id);
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
