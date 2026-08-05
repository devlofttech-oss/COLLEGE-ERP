// Dashboard (Spec §7.1): institution-level summary cards aggregated across
// modules. Kept read-only; heavy aggregations are computed on demand. At larger
// scale these should move to maintained counters — noted in PROGRESS.md.

import { db } from '../../config/firebase.js';
import { repo, institutionCollection, institutionCollectionFor } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';

const students = repo('students');
const staff = repo('staffMembers');
const admissions = repo('admissions');
const exams = repo('exams');
const results = repo('results');
const notices = repo('notices');
const feePayments = repo('feePayments');
const feeAssignments = repo('feeAssignments');

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export async function overview() {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');

  const [studentList, staffList, admissionList, examList, resultList, noticeList, payments, assignments] =
    await Promise.all([
      students.list({ includeArchived: true }),
      staff.list({}),
      admissions.list({ includeArchived: true }),
      exams.list({}),
      results.list({ where: [['published', '==', true]] }),
      notices.list({ orderBy: { field: 'createdAt', direction: 'desc' } }),
      feePayments.list({ includeArchived: true }),
      feeAssignments.list({}),
    ]);

  const activeStudents = studentList.filter((s) => !s.archived && s.status === 'active');
  const todayStart = startOfToday();
  const monthStart = startOfMonth();

  const collectedToday = payments
    .filter((p) => { const d = toDate(p.paidAt || p.createdAt); return d && d >= todayStart; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const collectedMonth = payments
    .filter((p) => { const d = toDate(p.paidAt || p.createdAt); return d && d >= monthStart; })
    .reduce((s, p) => s + (p.amount || 0), 0);
  const pendingDues = assignments
    .filter((a) => ['pending', 'partial'].includes(a.status))
    .reduce((s, a) => s + (a.balance || 0), 0);

  const now = new Date();
  const upcomingExams = examList
    .filter((e) => { const d = toDate(e.startDate); return d && d >= todayStart; })
    .sort((a, b) => toDate(a.startDate) - toDate(b.startDate))
    .slice(0, 5);

  return {
    students: {
      total: studentList.filter((s) => !s.archived).length,
      active: activeStudents.length,
      inactive: studentList.filter((s) => !s.archived && s.status !== 'active').length,
    },
    staff: { total: staffList.length, teaching: staffList.filter((s) => s.type === 'teaching').length },
    fees: { collectedToday, collectedMonth, pendingDues },
    admissions: {
      newEnquiries: admissionList.filter((a) => a.status === 'New').length,
      followUps: admissionList.filter((a) => a.status === 'Follow-up').length,
      pendingApplications: admissionList.filter((a) => a.stage === 'application').length,
      approved: admissionList.filter((a) => a.stage === 'approved').length,
    },
    exams: { upcoming: upcomingExams.map((e) => ({ id: e.id, name: e.name, startDate: e.startDate })) },
    results: { publishedCount: resultList.length },
    notices: { latest: noticeList.slice(0, 5).map((n) => ({ id: n.id, title: n.title, createdAt: n.createdAt })) },
    generatedAt: now.toISOString(),
  };
}

export async function recentActivities(limit = 20) {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const snap = await institutionCollection('auditLogs').orderBy('at', 'desc').limit(Number(limit) || 20).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Cross-tenant overview for the Devloft super-admin: totals per institution.
// Iterates the institutions registry (Devloft-scale = few colleges) rather than a
// collectionGroup query, so it needs no extra indexes.
export async function platformOverview() {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const instSnap = await db.collection('institutions').get();
  const perInstitution = await Promise.all(
    instSnap.docs.map(async (doc) => {
      const id = doc.id;
      const inst = doc.data();
      const [students, staffCount] = await Promise.all([
        institutionCollectionFor(id, 'students').where('archived', '==', false).count().get().catch(() => null),
        institutionCollectionFor(id, 'staffMembers').where('archived', '==', false).count().get().catch(() => null),
      ]);
      return {
        institutionId: id,
        name: inst.name || null,
        status: inst.status || null,
        enabledModules: inst.enabledModules || [],
        students: students ? students.data().count : null,
        staff: staffCount ? staffCount.data().count : null,
      };
    }),
  );
  return { institutions: perInstitution.length, perInstitution };
}
