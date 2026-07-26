// Students module — the full student lifecycle (Spec §7.2): profile with parent/
// guardian details, academic placement, documents, promotion/transfer, bulk
// import, export and ID card data.

import { db } from '../../config/firebase.js';
import { repo, serverTimestamp } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';
import { resolveFileUrl } from '../../services/storage.service.js';

const students = repo('students');
const studentDocuments = repo('studentDocuments');
const promotions = repo('studentPromotions');

const STATUSES = ['active', 'inactive', 'alumni', 'transferred'];
const GENDERS = ['Male', 'Female', 'Other'];
const DOC_STATUSES = ['pending', 'verified', 'rejected'];

// Editable student fields (whitelist — protects system fields).
const STUDENT_FIELDS = [
  'admissionNumber', 'admissionDate', 'name', 'photoKey', 'photoUrl',
  'gender', 'dob', 'bloodGroup', 'mobile', 'email', 'aadharNumber',
  'academicYear', 'courseId', 'courseName', 'classId', 'className', 'course',
  'sectionId', 'section', 'rollNumber',
  'fatherName', 'fatherMobile', 'motherName', 'motherMobile',
  'guardianName', 'guardianMobile', 'guardianRelation', 'address',
  'category', 'religion', 'nationality', 'status',
];

function generateAdmissionNumber(academicYear) {
  const yr = String(academicYear || new Date().getFullYear()).replace(/[^0-9]/g, '').slice(0, 4) || '0000';
  return `ADM-${yr}-${Date.now().toString().slice(-6)}`;
}

function normalize(data, { mode }) {
  const out = pick(data, STUDENT_FIELDS);

  if (mode === 'create') {
    requireFields(out, ['name', 'gender', 'dob', 'academicYear', 'fatherMobile']);
    if (!out.classId && !out.className && !out.course) {
      throw ApiError.badRequest('A class/course is required.');
    }
    if (!out.admissionNumber) out.admissionNumber = generateAdmissionNumber(out.academicYear);
    if (!out.admissionDate) out.admissionDate = new Date().toISOString().slice(0, 10);
    out.status = out.status || 'active';
  }

  oneOf(out.gender, GENDERS, 'gender');
  oneOf(out.status, STATUSES, 'status');
  if (out.name) out.nameLower = out.name.toLowerCase();
  return out;
}

// ── List with filters + prefix search ──
export async function listStudents(query = {}) {
  const { academicYear, classId, sectionId, courseId, status, gender, q, includeArchived } = query;
  const where = [];
  if (academicYear) where.push(['academicYear', '==', academicYear]);
  if (classId) where.push(['classId', '==', classId]);
  if (sectionId) where.push(['sectionId', '==', sectionId]);
  if (courseId) where.push(['courseId', '==', courseId]);
  if (status) where.push(['status', '==', status]);
  if (gender) where.push(['gender', '==', gender]);

  // Name prefix search using the stored lowercase field.
  const orderBy = q ? { field: 'nameLower' } : { field: 'nameLower' };
  let list = await students.list({ where, orderBy, includeArchived: includeArchived === 'true' });

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((s) =>
      (s.nameLower || '').includes(needle) ||
      (s.admissionNumber || '').toLowerCase().includes(needle) ||
      (s.rollNumber || '').toString().toLowerCase().includes(needle),
    );
  }
  return list;
}

export async function getStudent(id) {
  return students.getByIdOrFail(id);
}

export async function createStudent(data, actor) {
  const payload = normalize(data, { mode: 'create' });
  const created = await students.create(payload, { actor });
  recordAudit({ action: 'students.create', entity: 'student', entityId: created.id, actor });
  return created;
}

export async function updateStudent(id, data, actor) {
  const payload = normalize(data, { mode: 'update' });
  const updated = await students.update(id, payload, { actor });
  recordAudit({ action: 'students.update', entity: 'student', entityId: id, actor });
  return updated;
}

export async function archiveStudent(id, actor) {
  const s = await students.archive(id, { actor });
  recordAudit({ action: 'students.archive', entity: 'student', entityId: id, actor });
  return s;
}

export async function restoreStudent(id, actor) {
  return students.restore(id, { actor });
}

// ── Promotion / transfer ──
// Records a history entry and updates the student's current placement.
export async function promoteStudent(id, body, actor) {
  const student = await students.getByIdOrFail(id);
  requireFields(body, ['toClassId']);
  const record = {
    type: 'promotion',
    studentId: id,
    studentName: student.name,
    fromClassId: student.classId || null,
    fromClassName: student.className || student.course || null,
    fromAcademicYear: student.academicYear || null,
    toClassId: body.toClassId,
    toClassName: body.toClassName || null,
    toSectionId: body.toSectionId || null,
    toAcademicYear: body.toAcademicYear || student.academicYear || null,
    reason: body.reason || 'Annual promotion',
    at: serverTimestamp(),
  };
  await promotions.create(record, { actor });
  const updated = await students.update(id, {
    classId: body.toClassId,
    className: body.toClassName || student.className,
    sectionId: body.toSectionId || null,
    section: body.toSectionName || null,
    academicYear: body.toAcademicYear || student.academicYear,
  }, { actor });
  recordAudit({ action: 'students.promote', entity: 'student', entityId: id, actor, meta: { toClassId: body.toClassId } });
  return updated;
}

export async function transferStudent(id, body, actor) {
  const student = await students.getByIdOrFail(id);
  requireFields(body, ['toClassId']);
  await promotions.create({
    type: 'transfer',
    studentId: id,
    studentName: student.name,
    fromClassId: student.classId || null,
    fromSectionId: student.sectionId || null,
    toClassId: body.toClassId,
    toSectionId: body.toSectionId || null,
    reason: body.reason || 'Internal transfer',
    at: serverTimestamp(),
  }, { actor });
  const updated = await students.update(id, {
    classId: body.toClassId,
    className: body.toClassName || student.className,
    sectionId: body.toSectionId || null,
    section: body.toSectionName || null,
  }, { actor });
  recordAudit({ action: 'students.transfer', entity: 'student', entityId: id, actor });
  return updated;
}

export async function listPlacementHistory(studentId) {
  return promotions.list({ where: [['studentId', '==', studentId]], includeArchived: true });
}

// ── Documents (metadata in Firestore, files in R2) ──
export async function listDocuments(studentId) {
  const docs = await studentDocuments.list({ where: [['studentId', '==', studentId]], includeArchived: true });
  // Attach a readable URL (public URL or presigned GET) for each.
  return Promise.all(
    docs.map(async (d) => ({ ...d, url: d.fileKey ? await resolveFileUrl(d.fileKey).catch(() => null) : d.fileUrl || null })),
  );
}

export async function addDocument(studentId, body, actor) {
  await students.getByIdOrFail(studentId);
  requireFields(body, ['type', 'fileKey']);
  const doc = await studentDocuments.create({
    studentId,
    type: body.type, // photo | aadhar | tc | certificate | other
    fileKey: body.fileKey,
    fileName: body.fileName || null,
    fileSize: body.fileSize || null,
    contentType: body.contentType || null,
    status: 'pending',
    remarks: null,
  }, { actor });
  recordAudit({ action: 'students.addDocument', entity: 'student', entityId: studentId, actor, meta: { type: body.type } });
  return doc;
}

export async function setDocumentStatus(documentId, status, remarks, actor) {
  oneOf(status, DOC_STATUSES, 'status');
  const updated = await studentDocuments.update(documentId, { status, remarks: remarks || null }, { actor });
  recordAudit({ action: `students.document.${status}`, entity: 'studentDocument', entityId: documentId, actor });
  return updated;
}

// ── Bulk import (rows already parsed from Excel/CSV on the client) ──
export async function bulkImport(rows, actor) {
  if (!Array.isArray(rows) || !rows.length) throw ApiError.badRequest('No rows to import.');
  if (rows.length > 1000) throw ApiError.badRequest('Import is limited to 1000 rows per batch.');

  const created = [];
  const failed = [];
  for (let i = 0; i < rows.length; i += 1) {
    try {
      const payload = normalize(rows[i], { mode: 'create' });
      // eslint-disable-next-line no-await-in-loop
      const s = await students.create(payload, { actor });
      created.push({ row: i + 1, id: s.id, name: s.name });
    } catch (err) {
      failed.push({ row: i + 1, error: err.message });
    }
  }
  recordAudit({ action: 'students.bulkImport', entity: 'student', actor, meta: { created: created.length, failed: failed.length } });
  return { created: created.length, failed: failed.length, createdRecords: created, errors: failed };
}

// ── Export (CSV) ──
const EXPORT_COLUMNS = [
  ['admissionNumber', 'Admission No'],
  ['name', 'Name'],
  ['gender', 'Gender'],
  ['dob', 'DOB'],
  ['className', 'Class'],
  ['section', 'Section'],
  ['rollNumber', 'Roll No'],
  ['academicYear', 'Academic Year'],
  ['fatherName', 'Father Name'],
  ['fatherMobile', 'Father Mobile'],
  ['mobile', 'Mobile'],
  ['email', 'Email'],
  ['status', 'Status'],
];

function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportStudentsCsv(query = {}) {
  const list = await listStudents(query);
  const header = EXPORT_COLUMNS.map(([, label]) => label).join(',');
  const lines = list.map((s) => EXPORT_COLUMNS.map(([key]) => csvEscape(s[key])).join(','));
  return [header, ...lines].join('\n');
}

// ── ID card data (structured payload; PDF rendering handled by PDF service) ──
export async function idCardData(id) {
  const s = await students.getByIdOrFail(id);
  return {
    admissionNumber: s.admissionNumber,
    name: s.name,
    photoUrl: s.photoUrl || (s.photoKey ? await resolveFileUrl(s.photoKey).catch(() => null) : null),
    className: s.className || s.course || null,
    section: s.section || null,
    rollNumber: s.rollNumber || null,
    academicYear: s.academicYear || null,
    bloodGroup: s.bloodGroup || null,
    fatherName: s.fatherName || null,
    guardianMobile: s.guardianMobile || s.fatherMobile || null,
    address: s.address || null,
  };
}

export { STATUSES, GENDERS };
