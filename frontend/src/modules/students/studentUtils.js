export function relationMatches(record, student) {
  if (!record || !student) return false;
  return (
    record.studentRecordId === student.id ||
    record.entityRecordId === student.id ||
    record.ownerRecordId === student.id ||
    record.studentId === student.studentId ||
    record.entityId === student.studentId ||
    record.ownerId === student.studentId
  );
}

export const PENDING_ADMISSION_STATUS = 'Pending Approval';
export const APPROVED_ADMISSION_STATUS = 'Approved';
export const ACTIVE_STUDENT_STATUS = 'Active';

export function canApproveStudentAdmission(roleId = '') {
  return roleId === 'super-admin';
}

export function isAdmittedStatus(status = '') {
  return /active|approved|admitted/i.test(status);
}

export function statusRequiresSuperAdminApproval(status = '') {
  return isAdmittedStatus(status);
}

export function normalizeCreatedAdmissionStatus() {
  return PENDING_ADMISSION_STATUS;
}

export function normalizeEditableStudentStatus(status = '', roleId = '') {
  if (!statusRequiresSuperAdminApproval(status)) return status || PENDING_ADMISSION_STATUS;
  return canApproveStudentAdmission(roleId) ? status : PENDING_ADMISSION_STATUS;
}

export function latestRecord(records) {
  return records[records.length - 1] || null;
}

export function formatDisplayDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function validateStudentProfile(form) {
  const requiredFields = [
    ['name', 'Student name'],
    ['guardianName', 'Guardian name'],
    ['idHolder', 'ID holder'],
    ['phone', 'Phone'],
    ['className', 'Class'],
    ['section', 'Section'],
    ['program', 'Program'],
    ['academicYear', 'Academic year'],
  ];

  const missing = requiredFields.find(([key]) => !String(form[key] || '').trim());
  if (missing) return `${missing[1]} is required.`;

  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return 'Enter a valid email address.';
  }

  if (!/^[0-9+\-\s()]{7,20}$/.test(form.phone)) {
    return 'Enter a valid phone number.';
  }

  return '';
}

export function getNextClassName(className = '') {
  if (className.includes('XII')) return className;
  if (className.includes('XI')) return className.replace('XI', 'XII');
  if (className.includes('X')) return className.replace('X', 'XI');
  return className;
}

export function buildCourseOptionsFromStudents(students = [], existingCourses = []) {
  const byCode = new Map();
  existingCourses.forEach((course) => {
    if (course?.courseCode) byCode.set(course.courseCode, course);
  });

  students.forEach((student) => {
    const courseCode = student.courseCode || student.program;
    const courseName = student.courseName || student.program || student.className;
    if (!courseCode || byCode.has(courseCode)) return;
    byCode.set(courseCode, {
      courseCode,
      courseName,
      courseYear: student.courseYear || student.className || '',
      admissionType: student.admissionType || student.section || '',
      collegeName: student.collegeName || '',
      collegeCode: student.collegeCode || '',
      id: `derived-course-${courseCode}`,
    });
  });

  return [...byCode.values()];
}
