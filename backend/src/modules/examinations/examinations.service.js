// Examinations (Spec §7.8): exam creation, schedule by class/subject, max/passing
// marks, marks entry, and verification that locks marks before result processing.

import { db, admin } from '../../config/firebase.js';
import { repo, institutionCollection } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';

const exams = repo('exams');
const schedules = repo('examSchedules');
const marks = repo('marks');

const EXAM_TYPES = ['Internal', 'Final', 'Unit Test', 'Mid Term', 'Practical', 'Other'];

// ── Exams ──
export const listExams = (q = {}) => exams.list({ where: q.academicYear ? [['academicYear', '==', q.academicYear]] : [], orderBy: { field: 'startDate', direction: 'desc' } });
export async function createExam(data, actor) {
  requireFields(data, ['name', 'examType', 'startDate', 'endDate']);
  oneOf(data.examType, EXAM_TYPES, 'examType');
  const exam = await exams.create(pick(data, ['name', 'examType', 'startDate', 'endDate', 'academicYear', 'status']), { actor });
  recordAudit({ action: 'examinations.createExam', entity: 'exam', entityId: exam.id, actor });
  return exam;
}
export const updateExam = (id, data, actor) => exams.update(id, pick(data, ['name', 'examType', 'startDate', 'endDate', 'academicYear', 'status']), { actor });
export const archiveExam = (id, actor) => exams.archive(id, { actor });

// ── Schedules ──
export async function listSchedules(q = {}) {
  const where = [];
  ['examId', 'classId', 'subjectId'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  return schedules.list({ where, orderBy: { field: 'examDate' } });
}
export async function createSchedule(data, actor) {
  requireFields(data, ['examId', 'classId', 'subjectId', 'maxMarks']);
  return schedules.create({
    ...pick(data, ['examId', 'classId', 'className', 'subjectId', 'subjectName', 'examDate', 'startTime', 'maxMarks', 'passingMarks', 'room', 'status']),
    maxMarks: Number(data.maxMarks) || 0,
    passingMarks: data.passingMarks !== undefined ? Number(data.passingMarks) : null,
  }, { actor });
}
export const updateSchedule = (id, data, actor) => schedules.update(id, pick(data, ['examDate', 'startTime', 'maxMarks', 'passingMarks', 'room', 'status']), { actor });
export const archiveSchedule = (id, actor) => schedules.archive(id, { actor });

// ── Marks entry (bulk upsert; blocked once verified/locked) ──
export async function enterMarks(body, actor) {
  requireFields(body, ['examId', 'subjectId', 'classId', 'entries']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const { examId, subjectId, classId, entries } = body;
  if (!Array.isArray(entries) || !entries.length) throw ApiError.badRequest('entries must be a non-empty array.');

  // Refuse if this exam/subject/class is already verified (locked).
  const existingVerified = await marks.list({ where: [['examId', '==', examId], ['subjectId', '==', subjectId], ['classId', '==', classId], ['verified', '==', true]] });
  if (existingVerified.length) throw ApiError.conflict('Marks are verified/locked for this exam-subject-class. Unlock before editing.');

  const batch = db.batch();
  const col = institutionCollection('marks');
  for (const e of entries) {
    if (!e.studentId) throw ApiError.badRequest('Each entry needs a studentId.');
    batch.set(col.doc(`${examId}_${subjectId}_${e.studentId}`), {
      examId, subjectId, subjectName: body.subjectName || null, classId,
      studentId: e.studentId, studentName: e.studentName || null,
      marksObtained: e.marksObtained === null || e.marksObtained === undefined ? null : Number(e.marksObtained),
      maxMarks: body.maxMarks !== undefined ? Number(body.maxMarks) : null,
      absent: !!e.absent,
      verified: false, locked: false,
      enteredBy: actor?.uid || null,
      archived: false, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  recordAudit({ action: 'examinations.enterMarks', entity: 'marks', actor, meta: { examId, subjectId, classId, count: entries.length } });
  return { examId, subjectId, classId, saved: entries.length };
}

export async function listMarks(q = {}) {
  const where = [];
  ['examId', 'subjectId', 'classId', 'studentId'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  return marks.list({ where, includeArchived: true });
}

// Verify (lock) marks for an exam-subject-class so results can be processed.
export async function verifyMarks(body, actor) {
  requireFields(body, ['examId', 'subjectId', 'classId']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const list = await listMarks(body);
  if (!list.length) throw ApiError.badRequest('No marks found to verify for this selection.');
  const batch = db.batch();
  for (const m of list) batch.update(institutionCollection('marks').doc(m.id), { verified: true, locked: true, verifiedBy: actor?.uid || null, verifiedAt: admin.firestore.FieldValue.serverTimestamp() });
  await batch.commit();
  recordAudit({ action: 'examinations.verifyMarks', entity: 'marks', actor, meta: { ...body, count: list.length } });
  return { ...body, verified: list.length };
}

export async function unlockMarks(body, actor) {
  requireFields(body, ['examId', 'subjectId', 'classId']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const list = await listMarks(body);
  const batch = db.batch();
  for (const m of list) batch.update(institutionCollection('marks').doc(m.id), { verified: false, locked: false });
  await batch.commit();
  recordAudit({ action: 'examinations.unlockMarks', entity: 'marks', actor, meta: body });
  return { ...body, unlocked: list.length };
}

export { EXAM_TYPES };
