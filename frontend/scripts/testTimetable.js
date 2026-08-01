import assert from 'node:assert/strict';
import {
  DAYS,
  displayPeriodRange,
  filterTimetableEntriesByCourse,
  getClassOptions,
  getTimeSlotOptions,
  groupTimetableByDay,
  hasTimetableConflict,
  normalizeTimeSlotFields,
  sortPeriods,
  validateTimetableEntry,
  validateTimetablePeriod,
} from '../src/modules/timetable/timetableUtils.js';

const students = [
  { className: 'Class XI', section: 'A', status: 'Active' },
  { className: 'Class XI', section: 'A', status: 'Active' },
  { className: 'Class XII', section: 'B', status: 'Active' },
  { className: 'Class X', section: 'C', status: 'Archived' },
];

assert.equal(DAYS.includes('Sunday'), true);
assert.deepEqual(getClassOptions(students), ['Class XI - A', 'Class XII - B']);
assert.equal(validateTimetablePeriod({}), 'Name is required.');
assert.equal(validateTimetablePeriod({ name: 'P1', startTime: '09:00', endTime: '10:00' }), '');
assert.equal(validateTimetableEntry({}), 'Day is required.');
assert.equal(
  validateTimetableEntry({
    day: 'Monday',
    periodId: 'period-1',
    classId: 'class-1',
    subjectId: 'subject-1',
  }),
  ''
);

const entries = [
  {
    id: 'entry-1',
    classId: 'class-1',
    teacherId: 'staff-1',
    room: 'Room 1',
    day: 'Monday',
    periodId: 'period-1',
    status: 'active',
  },
];

assert.equal(hasTimetableConflict(entries, {
  classId: 'class-2',
  teacherId: 'staff-1',
  room: 'Room 2',
  day: 'Monday',
  periodId: 'period-1',
}), true);

assert.equal(hasTimetableConflict(entries, {
  classId: 'class-1',
  teacherId: 'staff-2',
  room: 'Room 1',
  day: 'Monday',
  periodId: 'period-1',
}), true);

assert.equal(hasTimetableConflict(entries, {
  classId: 'class-1',
  teacherId: 'staff-2',
  room: 'Room 2',
  day: 'Tuesday',
  periodId: 'period-1',
}), false);

assert.deepEqual(normalizeTimeSlotFields({ timeSlot: '02:00 - 03:00' }), {
  timeSlot: '02:00 - 03:00',
  startTime: '14:00',
  endTime: '15:00',
});

assert.deepEqual(
  getTimeSlotOptions([
    { timeSlot: '02:00 - 03:00', status: 'active' },
    { timeSlot: '09:00 - 10:00', status: 'active' },
    { timeSlot: '01:00 - 02:00', archived: true },
  ]),
  [
    { label: '09:00 - 10:00', startTime: '09:00', endTime: '10:00' },
    { label: '02:00 - 03:00', startTime: '14:00', endTime: '15:00' },
  ]
);

assert.deepEqual(sortPeriods([
  { id: 'period-2', name: 'P2', startTime: '10:00', order: 2 },
  { id: 'period-1', name: 'P1', startTime: '09:00', order: 1 },
]).map((period) => period.id), ['period-1', 'period-2']);
assert.equal(displayPeriodRange({ startTime: '09:00', endTime: '10:00' }), '09:00 - 10:00');
assert.deepEqual(groupTimetableByDay([{ id: 'entry-1', day: 'Monday' }]).Monday.map((entry) => entry.id), ['entry-1']);

assert.deepEqual(
  filterTimetableEntriesByCourse([
    { id: 'mlt-lateral', courseCode: 'MLTLAT', courseName: 'II B Sc MLT' },
    { id: 'mlt-regular', courseCode: 'MLTREG', courseName: 'I B Sc MLT' },
    { id: 'atot-regular', courseCode: 'ATOTREG', courseName: 'I B Sc Anaesthesia and Operation Theater Technology' },
    { id: 'legacy-entry', subjectName: 'Anatomy' },
  ], 'MLTLAT').map((entry) => entry.id),
  ['mlt-lateral', 'legacy-entry']
);

console.log('Timetable tests passed.');
