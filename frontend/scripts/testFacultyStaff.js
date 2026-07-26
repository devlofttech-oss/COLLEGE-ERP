import assert from 'node:assert/strict';
import {
  buildAttendanceKey,
  relationMatchesStaff,
  validateLeaveForm,
  validateStaffForm,
} from '../src/modules/facultyStaff/facultyStaffUtils.js';
import { demoStaffMembers } from '../src/modules/facultyStaff/demoFacultyStaff.js';

const staff = { id: 'staff-doc-id', employeeId: 'EMP-1001' };

assert.equal(relationMatchesStaff({ staffRecordId: 'staff-doc-id' }, staff), true);
assert.equal(relationMatchesStaff({ employeeId: 'EMP-1001' }, staff), true);
assert.equal(relationMatchesStaff({ employeeId: 'EMP-9999' }, staff), false);

assert.equal(buildAttendanceKey(staff, '18 Jun 2026'), 'EMP-1001-18 Jun 2026');

assert.equal(validateStaffForm({}), 'Name is required.');
assert.equal(
  validateStaffForm({
    name: 'Dr. Kavita Menon',
    employeeId: 'EMP-1001',
    staffType: 'Faculty',
    department: 'Science',
    designation: 'Lecturer',
    phone: 'bad',
    email: 'kavita@college.edu',
  }),
  'Enter a valid phone number.'
);
assert.equal(
  validateStaffForm({
    name: 'Dr. Kavita Menon',
    employeeId: 'EMP-1001',
    staffType: 'Faculty',
    department: 'Science',
    designation: 'Lecturer',
    phone: '+91 98765 43210',
    email: 'kavita@college.edu',
  }),
  ''
);

assert.equal(validateLeaveForm({}), 'Leave type is required.');
assert.equal(
  validateLeaveForm({
    leaveType: 'Casual Leave',
    fromDate: '2026-06-20',
    toDate: '2026-06-21',
    reason: 'Family function',
  }),
  ''
);

const requiredProfileFields = [
  'employeeId',
  'name',
  'staffType',
  'department',
  'designation',
  'qualification',
  'institution',
  'city',
  'specialization',
  'joiningDate',
  'appointmentType',
  'address',
  'previousExperience',
  'publications',
  'researchProjects',
  'qualificationDetails',
  'documentFileName',
  'documentStatus',
  'status',
];

assert.equal(demoStaffMembers.length, 8);
demoStaffMembers.forEach((member) => {
  requiredProfileFields.forEach((field) => {
    assert.ok(Object.hasOwn(member, field), `${member.name} is missing ${field}`);
  });
  assert.ok(Array.isArray(member.qualificationDetails), `${member.name} qualificationDetails must be an array`);
});

console.log('Faculty staff tests passed.');
