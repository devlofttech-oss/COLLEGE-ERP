import assert from 'node:assert/strict';
import {
  flattenPortalTimetable,
  formatPortalCurrency,
  formatPortalDate,
  getLinkedStudentIds,
  getPortalStudentClass,
  getPortalStudentId,
  getPortalStudentName,
  labelizePortalValue,
  myPortalPermissions,
  summarizePortalAttendance,
  summarizePortalClasses,
  summarizePortalDownloads,
  summarizePortalFees,
} from '../src/modules/myPortal/myPortalUtils.js';

assert.equal(myPortalPermissions.includes('students.viewOwn'), true);
assert.equal(myPortalPermissions.includes('attendance.mark'), true);

const student = {
  id: 'stu-1',
  studentId: 'S-001',
  name: 'Riya Sharma',
  className: 'BSc Nursing',
  section: 'A',
};
assert.equal(getPortalStudentId(student), 'stu-1');
assert.equal(getPortalStudentName(student), 'Riya Sharma');
assert.equal(getPortalStudentClass(student), 'BSc Nursing - A');
assert.deepEqual(getLinkedStudentIds({ profile: { linkedStudentIds: ['stu-1'] } }), ['stu-1']);
assert.deepEqual(getLinkedStudentIds({ linkedStudentIds: ['stu-2'] }), ['stu-2']);

assert.equal(formatPortalDate('2026-01-15'), '15 Jan 2026');
assert.equal(formatPortalCurrency(12500), '₹12,500');
assert.equal(labelizePortalValue('viewOwn_result'), 'View Own Result');

const attendance = summarizePortalAttendance({
  records: [
    { status: 'Present' },
    { status: 'Late' },
    { status: 'Absent' },
    { status: 'Leave' },
  ],
});
assert.deepEqual(attendance, {
  present: 2,
  absent: 1,
  late: 1,
  leave: 1,
  total: 4,
  percentage: 50,
  records: [
    { status: 'Present' },
    { status: 'Late' },
    { status: 'Absent' },
    { status: 'Leave' },
  ],
});

assert.deepEqual(summarizePortalFees({
  totalDue: 3000,
  pending: [{ balance: 3000, status: 'partial' }],
  assignments: [{ totalAmount: 10000 }],
  payments: [{ amount: 7000 }],
}), {
  assignments: [{ totalAmount: 10000 }],
  pending: [{ balance: 3000, status: 'partial' }],
  payments: [{ amount: 7000 }],
  totalAssigned: 10000,
  totalDue: 3000,
  totalPaid: 7000,
});

assert.deepEqual(flattenPortalTimetable({
  Monday: [{ id: 't1', subjectName: 'Anatomy' }],
  Tuesday: [],
}), [
  { day: 'Monday', entries: [{ id: 't1', subjectName: 'Anatomy' }] },
]);

assert.deepEqual(summarizePortalDownloads({
  documents: [{ id: 'd1' }],
  receipts: [{ id: 'r1' }, { id: 'r2' }],
}), {
  documents: [{ id: 'd1' }],
  receipts: [{ id: 'r1' }, { id: 'r2' }],
  total: 3,
});

assert.deepEqual(summarizePortalClasses({
  staffId: 'staff-1',
  staffName: 'Arun Teacher',
  allocations: [
    { classId: 'c1', subjectId: 's1' },
    { classId: 'c1', subjectId: 's2' },
  ],
}), {
  staffId: 'staff-1',
  staffName: 'Arun Teacher',
  allocations: [
    { classId: 'c1', subjectId: 's1' },
    { classId: 'c1', subjectId: 's2' },
  ],
  classes: 1,
  subjects: 2,
});

console.log('My Portal tests passed.');
