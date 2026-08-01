import assert from 'node:assert/strict';
import {
  calculateGrade,
  calculatePercentage,
  calculateResultStatus,
  summarizeStudentMarks,
  validateBackendExam,
  validateBackendMarks,
  validateBackendSchedule,
  validateExamSchedule,
  validateMarksEntry,
} from '../src/modules/exams/examUtils.js';

assert.equal(calculatePercentage(45, 50), 90);
assert.equal(calculateGrade(95), 'A+');
assert.equal(calculateGrade(82), 'A');
assert.equal(calculateGrade(39), 'F');
assert.equal(calculateResultStatus(40), 'Pass');
assert.equal(calculateResultStatus(39), 'Needs Improvement');

assert.deepEqual(
  summarizeStudentMarks([
    { marksObtained: 45, maxMarks: 50 },
    { marksObtained: 35, maxMarks: 50 },
  ]),
  {
    totalObtained: 80,
    totalMax: 100,
    percentage: 80,
    grade: 'A',
    status: 'Pass',
  }
);

assert.equal(validateExamSchedule({}), 'Exam name is required.');
assert.equal(validateExamSchedule({
  examName: 'Mid Term',
  classKey: 'Class XI - A',
  subject: 'Physics',
  examDate: '2026-06-25',
  maxMarks: 100,
}), '');

assert.equal(validateMarksEntry({}), 'Student is required.');
assert.equal(validateMarksEntry({
  studentRecordId: 'student-1',
  examScheduleId: 'exam-1',
  marksObtained: 101,
  maxMarks: 100,
}), 'Marks cannot exceed max marks.');

assert.equal(validateBackendExam({}), 'Exam name is required.');
assert.equal(validateBackendExam({
  name: 'Mid Term',
  examType: 'Mid Term',
  startDate: '2026-06-25',
  endDate: '2026-06-28',
}), '');

assert.equal(validateBackendSchedule({}), 'Exam is required.');
assert.equal(validateBackendSchedule({
  examId: 'exam-1',
  classId: 'class-1',
  subjectId: 'subject-1',
  maxMarks: 100,
  passingMarks: 101,
}), 'Passing marks cannot exceed max marks.');

assert.equal(validateBackendMarks({ examId: 'exam-1', classId: 'class-1', subjectId: 'subject-1', entries: [] }), 'At least one marks entry is required.');
assert.equal(validateBackendMarks({
  examId: 'exam-1',
  classId: 'class-1',
  subjectId: 'subject-1',
  maxMarks: 100,
  entries: [{ studentId: 'student-1', marksObtained: 101, absent: false }],
}), 'Marks cannot exceed max marks.');
assert.equal(validateBackendMarks({
  examId: 'exam-1',
  classId: 'class-1',
  subjectId: 'subject-1',
  maxMarks: 100,
  entries: [{ studentId: 'student-1', marksObtained: null, absent: true }],
}), '');

console.log('Exam tests passed.');
