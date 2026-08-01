import assert from 'node:assert/strict';
import {
  backendUserRoles,
  canAccess,
  canAccessFinancialReports,
  defaultRoles,
  filterBackendUsers,
  getRoleById,
  getUserId,
  getUserRole,
  getUserStatus,
  hasPermission,
  roleLabel,
  summarizeUsers,
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
assert.equal(hasPermission(admin, 'users.view'), true);
assert.equal(hasPermission(admin, 'users.manage'), true);
assert.equal(hasPermission(admin, 'staff.create'), true);
assert.equal(hasPermission(parent, 'users.manage'), false);

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
assert.equal(canAccess(defaultRoles, 'admin', 'communication.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'communication.create'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'communication.send'), true);
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
assert.equal(canAccess(defaultRoles, 'admin', 'users.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'users.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'roles.view'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'academicCurriculum.view'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'academics.manage'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'users.view'), true);
assert.equal(canAccess(defaultRoles, 'super-admin', 'users.manage'), true);
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
assert.equal(canAccess(defaultRoles, 'faculty', 'communication.view'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'communication.create'), true);
assert.equal(canAccess(defaultRoles, 'faculty', 'communication.send'), false);
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
assert.equal(canAccess(defaultRoles, 'parent', 'communication.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'attendance.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'fees.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'reports.view'), false);

const withoutUsersManage = togglePermission(admin, 'users.manage');
assert.equal(withoutUsersManage.includes('users.manage'), false);
const withUsersManage = togglePermission({ ...admin, permissions: withoutUsersManage }, 'users.manage');
assert.equal(withUsersManage.includes('users.manage'), true);

const users = [
  { id: 'uid-1', name: 'Riya Parent', email: 'riya@example.com', role: 'parent', status: 'active', linkedStudentIds: ['stu-1'] },
  { id: 'uid-2', name: 'Arun Teacher', email: 'arun@example.com', role: 'teacher', status: 'suspended', linkedStudentIds: [] },
  { uid: 'uid-3', name: 'Old Admin', email: 'old@example.com', roleId: 'admin', status: 'active', archived: true },
];
assert.equal(backendUserRoles.some((role) => role.id === 'principal'), true);
assert.equal(roleLabel('super-admin'), 'Super Admin');
assert.equal(getUserId(users[2]), 'uid-3');
assert.equal(getUserRole(users[2]), 'admin');
assert.equal(getUserStatus(users[0]), 'active');
assert.deepEqual(summarizeUsers(users), { total: 3, active: 1, archived: 1, linked: 1 });
assert.deepEqual(filterBackendUsers(users, { role: 'parent' }).map((user) => getUserId(user)), ['uid-1']);
assert.deepEqual(filterBackendUsers(users, { status: 'suspended' }).map((user) => getUserId(user)), ['uid-2']);
assert.deepEqual(filterBackendUsers(users, { search: 'teacher' }).map((user) => getUserId(user)), ['uid-2']);

assert.equal(validateUserForm({}), 'Name is required.');
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'bad',
    password: '123456',
    role: 'admin',
  }),
  'Valid email is required.'
);
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'admin@college.edu',
    password: '123',
    role: 'admin',
  }),
  'Password must be at least 12 characters.'
);
assert.equal(
  validateUserForm({
    name: 'Admin',
    email: 'admin@college.edu',
    password: '123456789012',
    role: 'admin',
  }),
  ''
);

assert.equal(validateUserForm({ name: 'Admin', email: 'admin@college.edu', password: '123456789012', role: 'bad' }), 'A valid role is required.');
assert.equal(validateUserUpdate({ name: 'Admin', role: 'admin', status: 'active' }), '');
assert.equal(validateUserUpdate({ name: 'Admin', role: '', status: 'active' }), 'Role is required.');
assert.equal(validateUserUpdate({ name: 'Admin', role: 'bad', status: 'active' }), 'A valid role is required.');

console.log('User role tests passed.');
