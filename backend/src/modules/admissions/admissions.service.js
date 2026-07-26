// Admissions (Spec §7.3): enquiry → follow-up → application → document review →
// approve → generate admission number → convert to student.

import { repo, serverTimestamp } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';
import { createStudent } from '../students/students.service.js';

const admissions = repo('admissions');
const followups = repo('admissionFollowups');

// stage tracks the pipeline; status is the finer-grained state used by the UI tabs.
const STAGES = ['enquiry', 'application', 'approved', 'rejected', 'converted'];
const STATUSES = ['New', 'Follow-up', 'Applied', 'Approved', 'Rejected', 'Converted'];

const FIELDS = [
  'studentName', 'parentName', 'phone', 'email', 'courseInterested',
  'source', 'followUpDate', 'status', 'stage', 'remarks', 'documents',
  'dob', 'gender', 'address', 'classInterested', 'academicYear',
];

function generateEnquiryNumber() {
  return `ENQ-${Date.now().toString().slice(-6)}`;
}
function generateAdmissionNumber(academicYear) {
  const yr = String(academicYear || new Date().getFullYear()).replace(/[^0-9]/g, '').slice(0, 4) || '0000';
  return `ADM-${yr}-${Date.now().toString().slice(-6)}`;
}

function normalize(data, { mode }) {
  const out = pick(data, FIELDS);
  if (mode === 'create') {
    requireFields(out, ['studentName', 'parentName', 'phone', 'courseInterested']);
    out.enquiryNumber = generateEnquiryNumber();
    out.stage = 'enquiry';
    out.status = out.status || 'New';
  }
  oneOf(out.status, STATUSES, 'status');
  oneOf(out.stage, STAGES, 'stage');
  return out;
}

export async function listAdmissions(query = {}) {
  const where = [];
  ['stage', 'status', 'source', 'courseInterested', 'academicYear'].forEach((f) => {
    if (query[f]) where.push([f, '==', query[f]]);
  });
  return admissions.list({ where, includeArchived: query.includeArchived === 'true', orderBy: { field: 'createdAt', direction: 'desc' } });
}

export const getAdmission = (id) => admissions.getByIdOrFail(id);

export async function createEnquiry(data, actor) {
  const created = await admissions.create(normalize(data, { mode: 'create' }), { actor });
  recordAudit({ action: 'admissions.createEnquiry', entity: 'admission', entityId: created.id, actor });
  return created;
}

export async function updateAdmission(id, data, actor) {
  return admissions.update(id, normalize(data, { mode: 'update' }), { actor });
}

export async function addFollowup(id, body, actor) {
  await admissions.getByIdOrFail(id);
  requireFields(body, ['note']);
  const f = await followups.create({
    admissionId: id,
    note: body.note,
    nextFollowUpDate: body.nextFollowUpDate || null,
    outcome: body.outcome || null,
    at: serverTimestamp(),
  }, { actor });
  // Reflect latest follow-up on the admission.
  await admissions.update(id, {
    status: 'Follow-up',
    followUpDate: body.nextFollowUpDate || null,
    lastFollowUpNote: body.note,
  }, { actor });
  return f;
}

export const listFollowups = (id) =>
  followups.list({ where: [['admissionId', '==', id]], includeArchived: true, orderBy: { field: 'createdAt', direction: 'desc' } });

export async function moveToApplication(id, actor) {
  return admissions.update(id, { stage: 'application', status: 'Applied' }, { actor });
}

export async function approveAdmission(id, body = {}, actor) {
  const adm = await admissions.getByIdOrFail(id);
  const admissionNumber = body.admissionNumber || generateAdmissionNumber(body.academicYear || adm.academicYear);
  const updated = await admissions.update(id, {
    stage: 'approved', status: 'Approved', admissionNumber,
    approvedAt: serverTimestamp(),
  }, { actor });
  recordAudit({ action: 'admissions.approve', entity: 'admission', entityId: id, actor, meta: { admissionNumber } });
  return updated;
}

export async function rejectAdmission(id, body = {}, actor) {
  const updated = await admissions.update(id, {
    stage: 'rejected', status: 'Rejected', rejectionReason: body.reason || null,
  }, { actor });
  recordAudit({ action: 'admissions.reject', entity: 'admission', entityId: id, actor });
  return updated;
}

// Convert an approved admission into a real student record.
export async function convertToStudent(id, body = {}, actor) {
  const adm = await admissions.getByIdOrFail(id);
  if (adm.stage === 'converted') throw ApiError.conflict('This admission is already converted.');

  const student = await createStudent({
    admissionNumber: adm.admissionNumber,
    name: adm.studentName,
    gender: adm.gender || body.gender || 'Other',
    dob: adm.dob || body.dob,
    academicYear: adm.academicYear || body.academicYear,
    classId: body.classId,
    className: body.className || adm.classInterested || adm.courseInterested,
    sectionId: body.sectionId,
    fatherName: adm.parentName,
    fatherMobile: adm.phone,
    email: adm.email,
    address: adm.address,
    status: 'active',
  }, actor);

  await admissions.update(id, { stage: 'converted', status: 'Converted', studentId: student.id }, { actor });
  recordAudit({ action: 'admissions.convert', entity: 'admission', entityId: id, actor, meta: { studentId: student.id } });
  return { admissionId: id, student };
}

export const archiveAdmission = (id, actor) => admissions.archive(id, { actor });
export const restoreAdmission = (id, actor) => admissions.restore(id, { actor });
