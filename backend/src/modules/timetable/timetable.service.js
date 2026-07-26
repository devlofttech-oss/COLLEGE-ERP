// Timetable (Spec §7.7): period settings, class + teacher timetable, room
// allocation, and conflict checking for teacher/room double-booking.

import { repo } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';

const periods = repo('periods');
const entries = repo('timetableEntries');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ── Period settings ──
export const listPeriods = () => periods.list({ orderBy: { field: 'order' } });
export async function createPeriod(data, actor) {
  requireFields(data, ['name', 'startTime', 'endTime']);
  return periods.create({
    ...pick(data, ['name', 'startTime', 'endTime', 'order', 'status']),
    order: Number(data.order) || 0,
  }, { actor });
}
export const updatePeriod = (id, data, actor) => periods.update(id, pick(data, ['name', 'startTime', 'endTime', 'order', 'status']), { actor });
export const archivePeriod = (id, actor) => periods.archive(id, { actor });

// ── Timetable entries with conflict detection ──
async function detectConflicts({ day, periodId, teacherId, room, academicYear }, excludeId) {
  const conflicts = [];
  if (teacherId) {
    const same = await entries.list({ where: [['day', '==', day], ['periodId', '==', periodId], ['teacherId', '==', teacherId]] });
    for (const e of same) if (e.id !== excludeId) conflicts.push({ type: 'teacher', entryId: e.id, detail: `Teacher already assigned to ${e.className || 'a class'} at this period.` });
  }
  if (room) {
    const same = await entries.list({ where: [['day', '==', day], ['periodId', '==', periodId], ['room', '==', room]] });
    for (const e of same) if (e.id !== excludeId) conflicts.push({ type: 'room', entryId: e.id, detail: `Room ${room} already in use at this period.` });
  }
  return conflicts;
}

export async function listEntries(q = {}) {
  const where = [];
  ['day', 'classId', 'sectionId', 'teacherId', 'academicYear'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  return entries.list({ where, orderBy: { field: 'periodId' } });
}

function normalizeEntry(data) {
  requireFields(data, ['day', 'periodId', 'classId', 'subjectId']);
  oneOf(data.day, DAYS, 'day');
  return pick(data, [
    'day', 'periodId', 'periodName', 'classId', 'className', 'sectionId', 'sectionName',
    'subjectId', 'subjectName', 'teacherId', 'teacherName', 'room', 'academicYear', 'status',
  ]);
}

export async function createEntry(data, actor, { force = false } = {}) {
  const payload = normalizeEntry(data);
  const conflicts = await detectConflicts(payload);
  if (conflicts.length && !force) throw ApiError.conflict('Timetable conflict detected.', { conflicts });
  const created = await entries.create(payload, { actor });
  return { entry: created, conflicts };
}

export async function updateEntry(id, data, actor, { force = false } = {}) {
  const payload = normalizeEntry({ ...(await entries.getByIdOrFail(id)), ...data });
  const conflicts = await detectConflicts(payload, id);
  if (conflicts.length && !force) throw ApiError.conflict('Timetable conflict detected.', { conflicts });
  const updated = await entries.update(id, payload, { actor });
  return { entry: updated, conflicts };
}

export const archiveEntry = (id, actor) => entries.archive(id, { actor });

// ── Views ──
export async function classTimetable(q = {}) {
  requireFields(q, ['classId']);
  const list = await listEntries({ classId: q.classId, sectionId: q.sectionId, academicYear: q.academicYear });
  return groupByDay(list);
}
export async function teacherTimetable(q = {}) {
  requireFields(q, ['teacherId']);
  const list = await listEntries({ teacherId: q.teacherId, academicYear: q.academicYear });
  return groupByDay(list);
}
function groupByDay(list) {
  const grid = {};
  for (const d of DAYS) grid[d] = [];
  for (const e of list) (grid[e.day] = grid[e.day] || []).push(e);
  return grid;
}

export { DAYS };
