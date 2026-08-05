// Results (Spec §7.9): process results from verified marks, compute percentage /
// grade / rank / pass-fail, publish to the app, lock/unlock, and expose report
// card data + history. Report-card PDF rendering is handled by the PDF service.

import { db } from '../../config/firebase.js';
import { repo, institutionCollection } from '../../utils/firestore.js';
import { requireFields, pick } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';

const results = repo('results');
const marks = repo('marks');
const gradeSettings = repo('gradeSettings');

// Default grade bands (overridable via gradeSettings collection).
const DEFAULT_GRADES = [
  { grade: 'A+', min: 90 }, { grade: 'A', min: 80 }, { grade: 'B+', min: 70 },
  { grade: 'B', min: 60 }, { grade: 'C', min: 50 }, { grade: 'D', min: 40 },
  { grade: 'F', min: 0 },
];

async function getGradeBands(academicYear) {
  const list = await gradeSettings.list({ where: academicYear ? [['academicYear', '==', academicYear]] : [] });
  if (list.length && Array.isArray(list[0].bands)) {
    return [...list[0].bands].sort((a, b) => b.min - a.min);
  }
  return DEFAULT_GRADES;
}
function gradeFor(percentage, bands) {
  return (bands.find((b) => percentage >= b.min) || bands[bands.length - 1]).grade;
}

// ── Grade settings ──
export const listGradeSettings = (q = {}) => gradeSettings.list({ where: q.academicYear ? [['academicYear', '==', q.academicYear]] : [] });
export async function saveGradeSettings(data, actor) {
  requireFields(data, ['academicYear', 'bands']);
  if (!Array.isArray(data.bands)) throw ApiError.badRequest('bands must be an array of { grade, min }.');
  const existing = (await gradeSettings.list({ where: [['academicYear', '==', data.academicYear]] }))[0];
  const payload = { academicYear: data.academicYear, bands: data.bands, passMark: Number(data.passMark) || 35 };
  return existing ? gradeSettings.update(existing.id, payload, { actor }) : gradeSettings.create(payload, { actor });
}

// ── Process results for an exam + class from verified marks ──
export async function processResults(body, actor) {
  requireFields(body, ['examId', 'classId']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const { examId, classId, academicYear } = body;

  const allMarks = await marks.list({ where: [['examId', '==', examId], ['classId', '==', classId]], includeArchived: false });
  if (!allMarks.length) throw ApiError.badRequest('No marks found for this exam/class.');
  const unverified = allMarks.filter((m) => !m.verified);
  if (unverified.length) throw ApiError.badRequest(`Cannot process: ${unverified.length} mark record(s) are not verified yet.`);

  const bands = await getGradeBands(academicYear);
  const passMark = (await listGradeSettings({ academicYear }))[0]?.passMark || 35;

  // Group marks by student.
  const byStudent = {};
  for (const m of allMarks) {
    const k = m.studentId;
    byStudent[k] = byStudent[k] || { studentId: k, studentName: m.studentName, subjects: [], total: 0, max: 0, failed: false };
    const obtained = m.absent ? 0 : (m.marksObtained || 0);
    const max = m.maxMarks || 0;
    const subjectPct = max ? (obtained / max) * 100 : 0;
    if (m.absent || subjectPct < passMark) byStudent[k].failed = true;
    byStudent[k].subjects.push({ subjectId: m.subjectId, subjectName: m.subjectName, marksObtained: obtained, maxMarks: max, absent: !!m.absent });
    byStudent[k].total += obtained;
    byStudent[k].max += max;
  }

  // Compute percentage/grade, then rank by total.
  const rows = Object.values(byStudent).map((s) => {
    const percentage = s.max ? Math.round((s.total / s.max) * 10000) / 100 : 0;
    return { ...s, percentage, grade: gradeFor(percentage, bands), status: s.failed ? 'Fail' : 'Pass' };
  });
  rows.sort((a, b) => b.total - a.total);
  rows.forEach((r, i) => { r.rank = i + 1; });

  // Upsert one result doc per student per exam.
  const batch = db.batch();
  const col = institutionCollection('results');
  for (const r of rows) {
    batch.set(col.doc(`${examId}_${r.studentId}`), {
      examId, classId, academicYear: academicYear || null,
      studentId: r.studentId, studentName: r.studentName,
      subjects: r.subjects, totalMarks: r.max, marksObtained: r.total,
      percentage: r.percentage, grade: r.grade, rank: r.rank, status: r.status,
      published: false, locked: false, archived: false,
    }, { merge: true });
  }
  await batch.commit();
  recordAudit({ action: 'results.process', entity: 'result', actor, meta: { examId, classId, count: rows.length } });
  return { examId, classId, processed: rows.length, results: rows };
}

export async function listResults(q = {}) {
  const where = [];
  ['examId', 'classId', 'studentId', 'status', 'published'].forEach((f) => {
    if (q[f] !== undefined) where.push([f, '==', f === 'published' ? q[f] === 'true' : q[f]]);
  });
  return results.list({ where, includeArchived: true, orderBy: { field: 'rank' } });
}

export async function publishResults(body, actor) {
  requireFields(body, ['examId', 'classId']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const list = await results.list({ where: [['examId', '==', body.examId], ['classId', '==', body.classId]] });
  if (!list.length) throw ApiError.badRequest('No processed results to publish. Process results first.');
  const batch = db.batch();
  for (const r of list) batch.update(institutionCollection('results').doc(r.id), { published: true, locked: true, publishedAt: new Date().toISOString() });
  await batch.commit();
  recordAudit({ action: 'results.publish', entity: 'result', actor, meta: { ...body, count: list.length } });
  return { ...body, published: list.length };
}

export async function setLock(body, locked, actor) {
  requireFields(body, ['examId', 'classId']);
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const list = await results.list({ where: [['examId', '==', body.examId], ['classId', '==', body.classId]] });
  const batch = db.batch();
  for (const r of list) batch.update(institutionCollection('results').doc(r.id), { locked, ...(locked ? {} : { published: false }) });
  await batch.commit();
  return { ...body, locked, count: list.length };
}

// Report card data for one student (PDF rendered by PDF service later).
export async function reportCard(examId, studentId) {
  const r = await results.getById(`${examId}_${studentId}`);
  if (!r) throw ApiError.notFound('Result not found for this student/exam.');
  return r;
}

export async function resultHistory(studentId) {
  return results.list({ where: [['studentId', '==', studentId]], includeArchived: true });
}
