import assert from 'node:assert/strict';
import {
  canAccess,
  canAccessFinancialReports,
  defaultRoles,
  getRoleById,
  hasPermission,
  togglePermission,
  validateUserForm,
  validateUserUpdate,
} from '../src/modules/userRoles/rolePermissions.js';

const admin = getRoleById(defaultRoles, 'admin');
const parent = getRoleById(defaultRoles, 'parent');
const superAdmin = getRoleById(defaultRoles, 'super-admin');

assert.equal(superAdmin.name, 'Super Admin');
assert.equal(admin.name, 'Admin');
assert.equal(hasPermission(admin, 'students.view'), true);
assert.equal(hasPermission(admin, 'students.edit'), true);
assert.equal(hasPermission(admin, 'students.create'), true);
assert.equal(hasPermission(admin, 'students.documents'), true);
assert.equal(hasPermission(admin, 'students.archive'), false);
assert.equal(hasPermission(admin, 'users.view'), false);
assert.equal(hasPermission(admin, 'users.create'), false);
assert.equal(hasPermission(admin, 'staff.create'), true);
assert.equal(hasPermission(parent, 'users.create'), false);

assert.equal(canAccess(defaultRoles, 'admin', 'attendance.report'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'timetable.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'timetable.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'examinations.create'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'examinations.verify'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'results.publish'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'fees.collect'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'fees.report'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'fees.structure'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'financialReports.export'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'financialReports.snapshots'), true);
assert.equal(canAccessFinancialReports(defaultRoles, 'admin'), true);
assert.equal(canAccessFinancialReports(defaultRoles, 'admin', 'financialReports.export'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'reports.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'academicCurriculum.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'academics.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'academics.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'notices.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'notices.create'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'documents.upload'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'documents.verify'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'subjectNotes.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'subjectNotes.upload'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'subjectNotes.edit'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'subjectNotes.archive'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'parentPortal.view'), false);
assert.equal(canAccess(defaultRoles, 'admin', 'parentPortal.viewAll'), false);
assert.equal(canAccess(defaultRoles, 'admin', 'settings.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'settings.manage'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'academicCurriculum.view'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'academics.manage'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'users.view'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'settings.manage'), true);

assert.equal(canAccess(defaultRoles, 'faculty', 'students.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'students.edit'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'academicCurriculum.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'academics.view'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'attendance.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'attendance.mark'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'attendance.report'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'staff.attendance'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'timetable.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'timetable.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'timetable.manage'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'subjectNotes.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'subjectNotes.upload'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'subjectNotes.edit'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'subjectNotes.archive'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'examinations.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'examinations.marks'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'examinations.verify'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'results.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'results.process'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'notices.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'notices.create'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'documents.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'documents.upload'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'fees.collect'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'financialReports.view'), false);
assert.equal(canAccessFinancialReports(defaultRoles, 'faculty'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'reports.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'parentPortal.view'), false);
assert.equal(canAccess(defaultRoles, 'faculty', 'settings.view'), false);

assert.equal(canAccess(defaultRoles, 'parent', 'academicCurriculum.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'academics.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'timetable.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'timetable.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'subjectNotes.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'examinations.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'examinations.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'results.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'documents.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'documents.upload'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'parentPortal.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'parentPortal.viewAll'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'notices.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'attendance.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'fees.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'reports.view'), false);

const withoutUsersCreate = togglePermission(admin, 'users.create');
assert.equal(withoutUsersCreate.includes('users.create'), true);
const withUsersCreate = togglePermission({ ...admin, permissions: withoutUsersCreate }, 'users.create');
assert.equal(withUsersCreate.includes('users.create'), false);

assert.equal(validateUserForm({}), 'Name is required.');
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'bad',
    password: '123456',
    roleId: 'admin',
  }),
  'Valid email is required.'
);
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'admin@college.edu',
    password: '123',
    roleId: 'admin',
  }),
  'Password must be at least 12 characters.'
);
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'admin@college.edu',
    password: '123456789012',
    roleId: 'admin',
  }),
  ''
);

assert.equal(validateUserUpdate({ name: 'Admin', roleId: 'admin', status: 'Active' }), '');
assert.equal(validateUserUpdate({ name: 'Admin', roleId: '', status: 'Active' }), 'Role is required.');

console.log('User role tests passed.');
