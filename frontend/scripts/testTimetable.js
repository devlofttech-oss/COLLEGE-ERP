import assert from 'node:assert/strict';
import {
  filterTimetableEntriesByCourse,
  getClassOptions,
  getTimeSlotOptions,
  hasTimetableConflict,
  normalizeTimeSlotFields,
  validateTimetableEntry,
} from '../src/modules/timetable/timetableUtils.js';

const students = [
  { className: 'Class XI', section: 'A', status: 'Active' },
  { className: 'Class XI', section: 'A', status: 'Active' },
  { className: 'Class XII', section: 'B', status: 'Active' },
  { className: 'Class X', section: 'C', status: 'Archived' },
];

assert.deepEqual(getClassOptions(students), ['Class XI - A', 'Class XII - B']);
assert.equal(validateTimetableEntry({}), 'Class is required.');
assert.equal(
  validateTimetableEntry({
    classKey: 'Class XI - A',
    subject: 'Physics',
    facultyId: 'staff-1',
    classroomId: 'room-1',
    day: 'Monday',
    timeSlot: '09:00 - 10:00',
  }),
  ''
);

const entries = [
  {
    id: 'entry-1',
    classKey: 'Class XI - A',
    facultyId: 'staff-1',
    classroomId: 'room-1',
    day: 'Monday',
    timeSlot: '09:00 - 10:00',
    status: 'Draft',
  },
];

assert.equal(hasTimetableConflict(entries, {
  classKey: 'Class XI - A',
  facultyId: 'staff-2',
  classroomId: 'room-2',
  day: 'Monday',
  timeSlot: '09:00 - 10:00',
}), true);

assert.equal(hasTimetableConflict(entries, {
  classKey: 'Class XII - B',
  facultyId: 'staff-2',
  classroomId: 'room-2',
  day: 'Tuesday',
  timeSlot: '09:00 - 10:00',
}), false);

assert.deepEqual(normalizeTimeSlotFields({ timeSlot: '02:00 - 03:00' }), {
  timeSlot: '02:00 - 03:00',
  startTime: '14:00',
  endTime: '15:00',
});

assert.deepEqual(
  getTimeSlotOptions([
    { timeSlot: '02:00 - 03:00', status: 'Published' },
    { timeSlot: '09:00 - 10:00', status: 'Published' },
    { timeSlot: '01:00 - 02:00', status: 'Archived' },
  ]),
  [
    { label: '09:00 - 10:00', startTime: '09:00', endTime: '10:00' },
    { label: '02:00 - 03:00', startTime: '14:00', endTime: '15:00' },
  ]
);

assert.deepEqual(
  filterTimetableEntriesByCourse([
    { id: 'mlt-lateral', courseCode: 'MLTLAT', courseName: 'II B Sc MLT' },
    { id: 'mlt-regular', courseCode: 'MLTREG', courseName: 'I B Sc MLT' },
    { id: 'atot-regular', courseCode: 'ATOTREG', courseName: 'I B Sc Anaesthesia and Operation Theater Technology' },
    { id: 'legacy-entry', subject: 'Anatomy' },
  ], 'MLTLAT').map((entry) => entry.id),
  ['mlt-lateral', 'legacy-entry']
);

console.log('Timetable tests passed.');
