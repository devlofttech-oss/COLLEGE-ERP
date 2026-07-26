// Staff (Spec §7.10): teaching + non-teaching profiles, departments, documents,
// and login creation (links a staff record to a Firebase Auth user + role).

import { repo } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';
import { resolveFileUrl } from '../../services/storage.service.js';
import { createUser } from '../users/users.service.js';

const staff = repo('staffMembers');
const departments = repo('departments');
const staffDocuments = repo('staffDocuments');

const TYPES = ['teaching', 'non-teaching'];
const STATUSES = ['active', 'inactive'];

const FIELDS = [
  'employeeId', 'name', 'photoKey', 'photoUrl', 'type', 'phone', 'email',
  'departmentId', 'department', 'designation', 'qualification', 'joiningDate',
  'address', 'gender', 'dob', 'role', 'status', 'userId',
];

function generateEmployeeId() {
  return `EMP-${Date.now().toString().slice(-6)}`;
}

function normalize(data, { mode }) {
  const out = pick(data, FIELDS);
  if (mode === 'create') {
    requireFields(out, ['name', 'phone']);
    if (!out.employeeId) out.employeeId = generateEmployeeId();
    out.type = out.type || 'teaching';
    out.status = out.status || 'active';
  }
  oneOf(out.type, TYPES, 'type');
  oneOf(out.status, STATUSES, 'status');
  if (out.name) out.nameLower = out.name.toLowerCase();
  return out;
}

// ── Staff ──
export async function listStaff(query = {}) {
  const where = [];
  ['type', 'departmentId', 'status'].forEach((f) => { if (query[f]) where.push([f, '==', query[f]]); });
  let list = await staff.list({ where, includeArchived: query.includeArchived === 'true', orderBy: { field: 'nameLower' } });
  if (query.q) {
    const n = String(query.q).toLowerCase();
    list = list.filter((s) => (s.nameLower || '').includes(n) || (s.employeeId || '').toLowerCase().includes(n));
  }
  return list;
}
export const getStaff = (id) => staff.getByIdOrFail(id);
export async function createStaff(data, actor) {
  const s = await staff.create(normalize(data, { mode: 'create' }), { actor });
  recordAudit({ action: 'staff.create', entity: 'staff', entityId: s.id, actor });
  return s;
}
export const updateStaff = (id, data, actor) => staff.update(id, normalize(data, { mode: 'update' }), { actor });
export const archiveStaff = (id, actor) => staff.archive(id, { actor });
export const restoreStaff = (id, actor) => staff.restore(id, { actor });

// Create a login for a staff member: Firebase Auth user + users profile + link.
export async function createLogin(id, body, actor) {
  const s = await staff.getByIdOrFail(id);
  requireFields(body, ['email', 'password', 'role']);
  const user = await createUser({
    email: body.email, password: body.password, name: s.name, role: body.role, phone: s.phone,
  }, actor);
  const updated = await staff.update(id, { userId: user.id, role: body.role, email: body.email }, { actor });
  recordAudit({ action: 'staff.createLogin', entity: 'staff', entityId: id, actor, meta: { role: body.role } });
  return { staff: updated, user };
}

// ── Departments ──
export const listDepartments = () => departments.list({ orderBy: { field: 'name' } });
export async function createDepartment(data, actor) {
  requireFields(data, ['name']);
  return departments.create(pick(data, ['name', 'code', 'headStaffId', 'status']), { actor });
}
export const updateDepartment = (id, data, actor) => departments.update(id, pick(data, ['name', 'code', 'headStaffId', 'status']), { actor });
export const archiveDepartment = (id, actor) => departments.archive(id, { actor });

// ── Documents ──
export async function listDocuments(staffId) {
  const docs = await staffDocuments.list({ where: [['staffId', '==', staffId]], includeArchived: true });
  return Promise.all(docs.map(async (d) => ({ ...d, url: d.fileKey ? await resolveFileUrl(d.fileKey).catch(() => null) : null })));
}
export async function addDocument(staffId, body, actor) {
  await staff.getByIdOrFail(staffId);
  requireFields(body, ['type', 'fileKey']);
  return staffDocuments.create({
    staffId, type: body.type, fileKey: body.fileKey, fileName: body.fileName || null,
    fileSize: body.fileSize || null, contentType: body.contentType || null, status: 'pending',
  }, { actor });
}
export function setDocumentStatus(documentId, status, remarks, actor) {
  oneOf(status, ['pending', 'verified', 'rejected'], 'status');
  return staffDocuments.update(documentId, { status, remarks: remarks || null }, { actor });
}
