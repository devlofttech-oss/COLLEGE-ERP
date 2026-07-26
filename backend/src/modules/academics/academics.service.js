// Academics: the academic structure everything else references — academic years,
// courses, classes, sections, subjects and teacher allocation (Spec §7.6).

import { repo } from '../../utils/firestore.js';
import { pick, requireFields, oneOf, toBool } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { db } from '../../config/firebase.js';

export const repos = {
  academicYears: repo('academicYears'),
  courses: repo('courses'),
  classes: repo('classes'),
  sections: repo('sections'),
  subjects: repo('subjects'),
  teacherAllocations: repo('teacherAllocations'),
};

const STATUS = ['active', 'inactive'];

async function assertExists(repository, id, label) {
  if (!id) return;
  const found = await repository.getById(id);
  if (!found) throw ApiError.badRequest(`${label} not found: ${id}`);
  return found;
}

// ── Validators (used as crudController `validate` hooks) ──

export const validators = {
  async academicYear(data) {
    requireFields(data, ['name']);
    const out = pick(data, ['name', 'startDate', 'endDate', 'workingDays', 'status', 'isCurrent']);
    oneOf(out.status, STATUS, 'status');
    if (out.workingDays !== undefined && !Array.isArray(out.workingDays)) {
      throw ApiError.badRequest('workingDays must be an array of day names.');
    }
    out.status = out.status || 'active';
    out.isCurrent = toBool(out.isCurrent);
    return out;
  },

  async course(data) {
    requireFields(data, ['name', 'academicYear']);
    const out = pick(data, ['name', 'code', 'academicYear', 'description', 'status']);
    oneOf(out.status, STATUS, 'status');
    out.status = out.status || 'active';
    return out;
  },

  async klass(data) {
    requireFields(data, ['name', 'academicYear']);
    const out = pick(data, ['name', 'courseId', 'courseName', 'academicYear', 'status']);
    if (out.courseId) {
      const course = await assertExists(repos.courses, out.courseId, 'Course');
      out.courseName = out.courseName || course.name;
    }
    oneOf(out.status, STATUS, 'status');
    out.status = out.status || 'active';
    return out;
  },

  async section(data) {
    requireFields(data, ['name', 'classId']);
    const out = pick(data, ['name', 'classId', 'className', 'academicYear', 'capacity', 'status']);
    const klass = await assertExists(repos.classes, out.classId, 'Class');
    out.className = out.className || klass.name;
    out.academicYear = out.academicYear || klass.academicYear;
    if (out.capacity !== undefined) out.capacity = Number(out.capacity) || null;
    oneOf(out.status, STATUS, 'status');
    out.status = out.status || 'active';
    return out;
  },

  async subject(data) {
    requireFields(data, ['name']);
    const out = pick(data, [
      'name', 'code', 'credits', 'classId', 'className', 'courseId',
      'academicYear', 'assignedTeacherId', 'assignedTeacherName', 'status',
    ]);
    if (out.classId) {
      const klass = await assertExists(repos.classes, out.classId, 'Class');
      out.className = out.className || klass.name;
      out.academicYear = out.academicYear || klass.academicYear;
    }
    if (out.credits !== undefined) out.credits = Number(out.credits) || null;
    oneOf(out.status, STATUS, 'status');
    out.status = out.status || 'active';
    return out;
  },

  async teacherAllocation(data) {
    requireFields(data, ['teacherId', 'subjectId']);
    const out = pick(data, [
      'teacherId', 'teacherName', 'subjectId', 'subjectName',
      'classId', 'className', 'sectionId', 'sectionName', 'academicYear', 'status',
    ]);
    const subject = await assertExists(repos.subjects, out.subjectId, 'Subject');
    out.subjectName = out.subjectName || subject.name;
    out.classId = out.classId || subject.classId;
    out.className = out.className || subject.className;
    out.academicYear = out.academicYear || subject.academicYear;
    oneOf(out.status, STATUS, 'status');
    out.status = out.status || 'active';
    return out;
  },
};

// Special action: mark one academic year as current (unset the rest).
export async function setCurrentAcademicYear(id, actor) {
  if (!db) throw new ApiError(503, 'Firestore is not configured.');
  const year = await repos.academicYears.getByIdOrFail(id);
  const all = await repos.academicYears.list({ includeArchived: true });
  const batch = db.batch();
  for (const y of all) {
    batch.update(db.collection('academicYears').doc(y.id), { isCurrent: y.id === id });
  }
  await batch.commit();
  return { ...year, isCurrent: true };
}

export async function getCurrentAcademicYear() {
  const list = await repos.academicYears.list({ where: [['isCurrent', '==', true]] });
  return list[0] || null;
}
