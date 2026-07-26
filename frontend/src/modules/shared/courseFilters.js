export function isAllCourses(courseCode = 'all') {
  return !courseCode || courseCode === 'all';
}

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

export function recordMatchesCourse(record = {}, selectedCourseCode = 'all', selectedCourse = null) {
  if (isAllCourses(selectedCourseCode)) return true;
  const selectedValues = [
    selectedCourseCode,
    selectedCourse?.courseCode,
    selectedCourse?.courseName,
    selectedCourse?.program,
    selectedCourse?.name,
  ].filter(Boolean).map(normalize);
  const recordValues = [
    record.courseCode,
    record.courseName,
    record.program,
    record.programName,
    record.className,
    record.classKey,
  ].filter(Boolean).map(normalize);
  return recordValues.some((value) => selectedValues.some((selected) => value === selected || value.includes(selected) || selected.includes(value)));
}

export function filterByCourse(records = [], selectedCourseCode = 'all', selectedCourse = null) {
  if (isAllCourses(selectedCourseCode)) return records;
  return records.filter((record) => recordMatchesCourse(record, selectedCourseCode, selectedCourse));
}

export function filterStudentsByCourse(students = [], selectedCourseCode = 'all', selectedCourse = null) {
  return filterByCourse(students, selectedCourseCode, selectedCourse);
}

export function getStudentScope(students = []) {
  return {
    recordIds: new Set(students.map((student) => student.id).filter(Boolean)),
    studentIds: new Set(students.map((student) => student.studentId).filter(Boolean)),
  };
}

export function recordMatchesStudentScope(record = {}, scope = getStudentScope([])) {
  return (
    scope.recordIds.has(record.studentRecordId) ||
    scope.recordIds.has(record.entityRecordId) ||
    scope.recordIds.has(record.ownerRecordId) ||
    scope.recordIds.has(record.ownerId) ||
    scope.studentIds.has(record.studentId) ||
    scope.studentIds.has(record.entityId) ||
    scope.studentIds.has(record.ownerId)
  );
}

export function filterStudentScopedRecords(records = [], scopedStudents = [], selectedCourseCode = 'all', selectedCourse = null) {
  if (isAllCourses(selectedCourseCode)) return records;
  const scope = getStudentScope(scopedStudents);
  return records.filter((record) => recordMatchesCourse(record, selectedCourseCode, selectedCourse) || recordMatchesStudentScope(record, scope));
}
