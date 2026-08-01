import assert from 'node:assert/strict';
import {
  backendUserRoles,
  canAccess,
  defaultRoles,
  filterBackendUsers,
  getRoleById,
  getUserId,
  getUserRole,
  getUserStatus,
  hasPermission,
  permissionGroups,
  roleLabel,
  summarizeUsers,
  togglePermission,
  validateUserForm,
  validateUserUpdate,
} from '../src/modules/userRoles/rolePermissions.js';
import {
  countDraftGroupPermissions,
  filterRoles,
  groupPermissions,
  hasRoleOverride,
  permissionAction,
  permissionLabel,
  samePermissionSet,
  summarizeRoles,
  togglePermission as toggleRolePermission,
  validatePermissionSet,
} from '../src/modules/roles/roleUtils.js';

const allPermissions = permissionGroups.flatMap((group) => group.permissions.map(([key]) => key));
const admin = getRoleById(defaultRoles, 'admin');
const parent = getRoleById(defaultRoles, 'parent');
const superAdmin = getRoleById(defaultRoles, 'super-admin');
const principal = getRoleById(defaultRoles, 'principal');
const accountant = getRoleById(defaultRoles, 'accountant');
const reception = getRoleById(defaultRoles, 'reception');
const teacher = getRoleById(defaultRoles, 'teacher');
const student = getRoleById(defaultRoles, 'student');

assert.deepEqual(defaultRoles.map((role) => role.id), backendUserRoles.map((role) => role.id));
assert.equal(superAdmin.name, 'Super Admin');
assert.equal(admin.name, 'Admin');
assert.deepEqual([...admin.permissions].sort(), [...allPermissions].sort());
assert.deepEqual([...superAdmin.permissions].sort(), [...allPermissions].sort());
assert.equal(hasPermission(admin, 'students.view'), true);
assert.equal(hasPermission(admin, 'students.archive'), true);
assert.equal(hasPermission(parent, 'users.manage'), false);

assert.equal(allPermissions.includes('academicCurriculum.view'), false);
assert.equal(allPermissions.includes('subjectNotes.view'), false);
assert.equal(allPermissions.includes('hostel.view'), false);
assert.equal(allPermissions.includes('documents.view'), false);
assert.equal(allPermissions.includes('financialReports.view'), false);
assert.equal(allPermissions.includes('parentPortal.view'), false);

assert.equal(canAccess(defaultRoles, 'admin', 'dashboard.view'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'students.import'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'students.idcard'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'attendance.report'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'timetable.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'examinations.verify'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'results.publish'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'fees.collect'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'reports.export'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'academics.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'communication.send'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'settings.manage'), true);
assert.equal(canAccess(defaultRoles, 'admin', 'roles.manage'), true);

assert.equal(canAccess(defaultRoles, 'principal', 'dashboard.view'), true);
assert.equal(hasPermission(principal, 'students.edit'), true);
assert.equal(canAccess(defaultRoles, 'principal', 'fees.report'), true);
assert.equal(canAccess(defaultRoles, 'principal', 'reports.export'), true);
assert.equal(canAccess(defaultRoles, 'principal', 'settings.manage'), false);

assert.equal(hasPermission(accountant, 'fees.collect'), true);
assert.equal(canAccess(defaultRoles, 'accountant', 'fees.structure'), true);
assert.equal(canAccess(defaultRoles, 'accountant', 'students.edit'), false);

assert.equal(hasPermission(reception, 'admissions.convert'), true);
assert.equal(canAccess(defaultRoles, 'reception', 'students.create'), true);
assert.equal(canAccess(defaultRoles, 'reception', 'fees.collect'), false);

assert.equal(hasPermission(teacher, 'students.view'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'academics.view'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'attendance.mark'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'timetable.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'examinations.marks'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'reports.view'), true);
assert.equal(canAccess(defaultRoles, 'teacher', 'fees.collect'), false);
assert.equal(canAccess(defaultRoles, 'teacher', 'settings.view'), false);

assert.equal(hasPermission(parent, 'students.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'fees.pay'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'timetable.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'communication.view'), true);
assert.equal(canAccess(defaultRoles, 'parent', 'dashboard.view'), false);
assert.equal(canAccess(defaultRoles, 'parent', 'reports.view'), false);

assert.equal(hasPermission(student, 'students.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'student', 'fees.viewOwn'), true);
assert.equal(canAccess(defaultRoles, 'student', 'fees.pay'), false);
assert.equal(canAccess(defaultRoles, 'student', 'communication.view'), true);

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

const roleCatalog = {
  groups: {
    dashboard: ['dashboard.view'],
    roles: ['roles.view', 'roles.manage'],
  },
  all: ['dashboard.view', 'roles.view', 'roles.manage'],
};
const roleRows = [
  {
    id: 'admin',
    label: 'Institution Admin',
    description: 'Full access',
    permissions: ['dashboard.view', 'roles.view'],
    defaultPermissions: ['dashboard.view', 'roles.view', 'roles.manage'],
  },
  {
    id: 'parent',
    label: 'Parent',
    description: 'Own child data',
    permissions: [],
    defaultPermissions: [],
  },
];

assert.equal(permissionLabel('roles.manage'), 'Roles Manage');
assert.equal(permissionAction('roles.manage'), 'Manage');
assert.deepEqual(groupPermissions(roleCatalog).map((group) => group.id), ['dashboard', 'roles']);
assert.equal(countDraftGroupPermissions(['roles.view'], roleCatalog.groups.roles), 1);
assert.equal(hasRoleOverride(roleRows[0]), true);
assert.equal(hasRoleOverride(roleRows[1]), false);
assert.equal(samePermissionSet(['roles.view', 'dashboard.view'], ['dashboard.view', 'roles.view']), true);
assert.deepEqual(toggleRolePermission(['roles.view'], 'roles.manage'), ['roles.manage', 'roles.view']);
assert.deepEqual(toggleRolePermission(['roles.manage', 'roles.view'], 'roles.manage'), ['roles.view']);
assert.deepEqual(filterRoles(roleRows, 'child').map((role) => role.id), ['parent']);
assert.deepEqual(summarizeRoles(roleRows, roleCatalog), { roles: 2, customized: 1, defaults: 1, permissions: 3, groups: 2 });
assert.equal(validatePermissionSet(['roles.view'], roleCatalog), '');
assert.equal(validatePermissionSet(['bad.permission'], roleCatalog), 'Unknown permissions: bad.permission');

console.log('User role tests passed.');
