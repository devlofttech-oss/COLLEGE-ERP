import assert from 'node:assert/strict';
import {
  DEFAULT_GRADE_BANDS,
  formatPercentage,
  normalizeGradeBands,
  resultStatusClasses,
  validateGradeSettings,
  validateResultSelection,
} from '../src/modules/results/resultsUtils.js';

assert.deepEqual(normalizeGradeBands([]), DEFAULT_GRADE_BANDS);
assert.deepEqual(normalizeGradeBands([{ grade: 'B', min: '60' }, { grade: 'A', min: '80' }]), [
  { grade: 'A', min: 80 },
  { grade: 'B', min: 60 },
]);

assert.equal(validateGradeSettings({}), 'Academic year is required.');
assert.equal(validateGradeSettings({ academicYear: '2026-2027', passMark: 101, bands: DEFAULT_GRADE_BANDS }), 'Pass mark must be between 0 and 100.');
assert.equal(validateGradeSettings({ academicYear: '2026-2027', passMark: 35, bands: [{ grade: 'A', min: 80 }, { grade: 'A', min: 70 }] }), 'Grade labels must be unique.');
assert.equal(validateGradeSettings({ academicYear: '2026-2027', passMark: 35, bands: DEFAULT_GRADE_BANDS }), '');

assert.equal(validateResultSelection({}), 'Exam is required.');
assert.equal(validateResultSelection({ examId: 'exam-1' }), 'Class is required.');
assert.equal(validateResultSelection({ examId: 'exam-1', classId: 'class-1' }), '');

assert.equal(formatPercentage(91.234), '91.23%');
assert.equal(formatPercentage(''), '0%');
assert.equal(resultStatusClasses('Pass').includes('emerald'), true);
assert.equal(resultStatusClasses('Fail').includes('rose'), true);

console.log('Results tests passed.');
