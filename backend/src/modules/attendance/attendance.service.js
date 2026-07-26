// Attendance (Spec §7.4): class-wise student attendance + staff attendance, with
// present/absent/late/leave statuses and daily/monthly/student/class reports.
//
// One record per subject-less day per person, keyed `${date}_${personId}` so
// re-marking the same day is idempotent (upsert).

import { db, admin } from '../../config/firebase.js';
import { repo } from '../../utils/firestore.js';
import { requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';

const STATUSES = ['present', 'absent', 'late', 'leave'];
const studentAttendance = repo('attendanceRecords');
const staffAttendance = repo('staffAttendanceRecords');

function assertDb() {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  return db;
}

// entries: [{ studentId, studentName, status, remarks }]
export async function markStudentAttendance(body, actor) {
  requireFields(body, ['date', 'entries']);
  const { date, academicYear = null, classId = null, sectionId = null, entries } = body;
  if (!Array.isArray(entries) || !entries.length) throw ApiError.badRequest('entries must be a non-empty array.');

  const batch = assertDb().batch();
  const col = db.collection('attendanceRecords');
  for (const e of entries) {
    if (!e.studentId) throw ApiError.badRequest('Each entry needs a studentId.');
    oneOf(e.status, STATUSES, 'status');
    const ref = col.doc(`${date}_${e.studentId}`);
    batch.set(ref, {
      date, academicYear, classId, sectionId,
      studentId: e.studentId, studentName: e.studentName || null,
      status: e.status, remarks: e.remarks || null,
      markedBy: actor?.uid || null, markedByName: actor?.email || null,
      archived: false, updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  recordAudit({ action: 'attendance.mark', entity: 'attendance', actor, meta: { date, classId, count: entries.length } });
  return { date, classId, sectionId, marked: entries.length };
}

export async function listStudentAttendance(query = {}) {
  const where = [];
  ['date', 'classId', 'sectionId', 'studentId', 'academicYear', 'status'].forEach((f) => {
    if (query[f]) where.push([f, '==', query[f]]);
  });
  // Date range (from/to) when no exact date given.
  if (!query.date && query.from) where.push(['date', '>=', query.from]);
  if (!query.date && query.to) where.push(['date', '<=', query.to]);
  return studentAttendance.list({ where, includeArchived: true });
}

export async function markStaffAttendance(body, actor) {
  requireFields(body, ['date', 'entries']);
  const { date, entries } = body;
  const batch = assertDb().batch();
  const col = db.collection('staffAttendanceRecords');
  for (const e of entries) {
    if (!e.staffId) throw ApiError.badRequest('Each entry needs a staffId.');
    oneOf(e.status, STATUSES, 'status');
    batch.set(col.doc(`${date}_${e.staffId}`), {
      date, staffId: e.staffId, staffName: e.staffName || null,
      status: e.status, remarks: e.remarks || null,
      markedBy: actor?.uid || null, archived: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  recordAudit({ action: 'attendance.markStaff', entity: 'attendance', actor, meta: { date, count: entries.length } });
  return { date, marked: entries.length };
}

export async function listStaffAttendance(query = {}) {
  const where = [];
  ['date', 'staffId', 'status'].forEach((f) => { if (query[f]) where.push([f, '==', query[f]]); });
  if (!query.date && query.from) where.push(['date', '>=', query.from]);
  if (!query.date && query.to) where.push(['date', '<=', query.to]);
  return staffAttendance.list({ where, includeArchived: true });
}

// ── Reports ──
function tally(records) {
  const t = { present: 0, absent: 0, late: 0, leave: 0, total: records.length };
  for (const r of records) if (t[r.status] !== undefined) t[r.status] += 1;
  return t;
}

export async function dailyReport(query = {}) {
  requireFields(query, ['date']);
  const records = await listStudentAttendance({ date: query.date, classId: query.classId, sectionId: query.sectionId });
  return { date: query.date, summary: tally(records), records };
}

// Attendance % per student over a date range.
export async function studentPercentage(query = {}) {
  requireFields(query, ['studentId']);
  const records = await listStudentAttendance({ studentId: query.studentId, from: query.from, to: query.to });
  const t = tally(records);
  const consideredPresent = t.present + t.late; // late still counts as attended
  const percentage = t.total ? Math.round((consideredPresent / t.total) * 100) : 0;
  return { studentId: query.studentId, ...t, percentage };
}

// Class-wise monthly summary: per-student present counts.
export async function monthlyReport(query = {}) {
  requireFields(query, ['from', 'to', 'classId']);
  const records = await listStudentAttendance({ classId: query.classId, sectionId: query.sectionId, from: query.from, to: query.to });
  const byStudent = {};
  for (const r of records) {
    const k = r.studentId;
    byStudent[k] = byStudent[k] || { studentId: k, studentName: r.studentName, present: 0, absent: 0, late: 0, leave: 0, total: 0 };
    byStudent[k].total += 1;
    if (byStudent[k][r.status] !== undefined) byStudent[k][r.status] += 1;
  }
  const students = Object.values(byStudent).map((s) => ({
    ...s, percentage: s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0,
  }));
  return { classId: query.classId, range: { from: query.from, to: query.to }, students };
}

export { STATUSES };
