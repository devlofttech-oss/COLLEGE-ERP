// Portal — self-scoped endpoints for the mobile app (Spec §8). Parent/student see
// ONLY their linked student's data; teachers see ONLY their assigned classes.
// All scoping is enforced server-side so a user can never read another's data.

import { repo } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';
import { getStudent, listDocuments as listStudentDocuments } from '../students/students.service.js';
import { listStudentAttendance, studentPercentage } from '../attendance/attendance.service.js';
import { listAssignments, paymentHistory } from '../fees/fees.service.js';
import { classTimetable, teacherTimetable } from '../timetable/timetable.service.js';
import { listSchedules } from '../examinations/examinations.service.js';
import { listResults } from '../results/results.service.js';
import { listNotices } from '../communication/communication.service.js';

const staff = repo('staffMembers');
const teacherAllocations = repo('teacherAllocations');

// ── Ownership helpers (parent/student) ──
function linkedIds(user) {
  return user?.profile?.linkedStudentIds || [];
}

// Resolve which student the request targets, and verify the caller may see it.
function resolveStudentId(user, requestedId) {
  const ids = linkedIds(user);
  if (!ids.length) throw ApiError.forbidden('No student is linked to this account.');
  if (requestedId) {
    if (!ids.includes(requestedId)) throw ApiError.forbidden('You cannot access this student.');
    return requestedId;
  }
  return ids[0]; // default to the first linked student
}

export async function myStudents(user) {
  const ids = linkedIds(user);
  const students = await Promise.all(ids.map((id) => getStudent(id).catch(() => null)));
  return students.filter(Boolean);
}

export async function myProfile(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  return getStudent(studentId);
}

export async function myAttendance(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  const [records, percentage] = await Promise.all([
    listStudentAttendance({ studentId, from: query.from, to: query.to }),
    studentPercentage({ studentId, from: query.from, to: query.to }).catch(() => null),
  ]);
  return { studentId, percentage, records };
}

export async function myFees(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  const [assignments, payments] = await Promise.all([
    listAssignments({ studentId }),
    paymentHistory({ studentId }),
  ]);
  const pending = assignments.filter((a) => ['pending', 'partial'].includes(a.status));
  const totalDue = pending.reduce((s, a) => s + (a.balance || 0), 0);
  return { studentId, totalDue, pending, assignments, payments };
}

export async function myTimetable(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  const student = await getStudent(studentId);
  if (!student.classId) return { studentId, timetable: {} };
  return { studentId, timetable: await classTimetable({ classId: student.classId, sectionId: student.sectionId, academicYear: student.academicYear }) };
}

export async function myExams(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  const student = await getStudent(studentId);
  if (!student.classId) return { studentId, schedules: [] };
  return { studentId, schedules: await listSchedules({ classId: student.classId }) };
}

export async function myResults(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  // Only published results are visible in the app.
  const results = await listResults({ studentId, published: 'true' });
  return { studentId, results };
}

export async function myNotices(user, query) {
  const student = linkedIds(user).length ? await getStudent(resolveStudentId(user, query.studentId)).catch(() => null) : null;
  const all = await listNotices({});
  const roleAudience = user.role === 'parent' ? 'parents' : user.role === 'student' ? 'students' : null;
  const visible = all.filter((n) => {
    if (n.status && n.status !== 'published') return false;
    if (n.audience === 'all') return true;
    if (roleAudience && n.audience === roleAudience) return true;
    if (n.audience === 'class' && student && n.classId && n.classId === student.classId) return true;
    return false;
  });
  return { notices: visible };
}

export async function myDownloads(user, query) {
  const studentId = resolveStudentId(user, query.studentId);
  const [documents, fees] = await Promise.all([
    listStudentDocuments(studentId).catch(() => []),
    paymentHistory({ studentId }).catch(() => []),
  ]);
  return {
    studentId,
    documents,
    receipts: fees.map((p) => ({ id: p.id, receiptNumber: p.receiptNumber, amount: p.amount, url: `/api/fees/receipts/${p.id}/pdf` })),
  };
}

// ── Teacher scoping ──
async function resolveStaffId(user) {
  // A staff record links to the login via userId === uid.
  const matches = await staff.list({ where: [['userId', '==', user.uid]] });
  if (!matches.length) throw ApiError.forbidden('No staff profile is linked to this account.');
  return matches[0];
}

export async function myClasses(user) {
  const staffRec = await resolveStaffId(user);
  const allocations = await teacherAllocations.list({ where: [['teacherId', '==', staffRec.id]] });
  return { staffId: staffRec.id, staffName: staffRec.name, allocations };
}

export async function myTeachingTimetable(user, query) {
  const staffRec = await resolveStaffId(user);
  return { staffId: staffRec.id, timetable: await teacherTimetable({ teacherId: staffRec.id, academicYear: query.academicYear }) };
}
