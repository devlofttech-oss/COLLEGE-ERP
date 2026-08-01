import assert from 'node:assert/strict';
import { getCanonicalModulePath, getEnabledModules, getModuleById, getModuleByPath, moduleRegistry, sortModulesByDisplayOrder } from '../src/modules/moduleRegistry.js';
import { canAccess, defaultRoles } from '../src/modules/userRoles/rolePermissions.js';

const enabled = getEnabledModules();
assert.equal(enabled.every((module) => module.status !== 'disabled'), true);
assert.equal(getModuleById('dashboard').label, 'Dashboard');
assert.equal(getModuleById('students').permission, 'students.view');
assert.deepEqual(getModuleById('timetable').permission, ['timetable.view', 'timetable.viewOwn']);
assert.deepEqual(getModuleById('examination-results').permission, ['examinations.view', 'examinations.viewOwn']);
assert.deepEqual(getModuleById('results').permission, ['results.view', 'results.viewOwn']);
assert.equal(getModuleById('fees').permission, 'fees.view');
assert.equal(getModuleById('fees').label, 'Payment');
assert.equal(getModuleById('communication').label, 'Communication');
assert.equal(getModuleById('communication').permission, 'communication.view');
assert.equal(getModuleById('user-roles').label, 'Users');
assert.equal(getModuleById('roles').label, 'Roles');
assert.equal(getModuleById('roles').permission, 'roles.view');
assert.equal(getModuleById('notice-board').id, 'communication');
assert.equal(getModuleById('financial-reports').id, 'reports');
assert.equal(getModuleById('parent-portal').id, 'my-portal');
assert.equal(getModuleByPath('/modules/notice-board').id, 'communication');
assert.equal(getModuleByPath('/modules/financial-reports').id, 'reports');
assert.equal(getModuleByPath('/modules/parent-portal').id, 'my-portal');
assert.equal(getCanonicalModulePath('notice-board'), '/modules/communication');
assert.equal(getCanonicalModulePath('financial-reports'), '/modules/reports');
assert.equal(getCanonicalModulePath('parent-portal'), '/modules/my-portal');
assert.equal(getCanonicalModulePath('students'), '/students');
assert.equal(getCanonicalModulePath('missing-module'), null);
assert.deepEqual(getModuleById('my-portal').permission, [
  'students.viewOwn',
  'attendance.viewOwn',
  'fees.viewOwn',
  'timetable.viewOwn',
  'examinations.viewOwn',
  'results.viewOwn',
  'communication.view',
  'attendance.mark',
  'timetable.view',
  'examinations.marks',
]);
assert.equal(getModuleById('missing-module'), null);

const modulesWithoutPermission = moduleRegistry.filter((module) => !module.permission);
assert.deepEqual(modulesWithoutPermission, []);

const visibleSidebarIds = (roleId) => sortModulesByDisplayOrder(enabled
  .filter((module) => canAccess(defaultRoles, roleId, module.permission))
  .filter((module) => !module.footer)
  .filter((module) => !module.hideFromSidebar || (module.id === 'dashboard' && ['admin', 'super-admin'].includes(roleId)) || (module.id === 'my-portal' && ['parent', 'student', 'teacher', 'faculty'].includes(roleId)) || (!['dashboard', 'my-portal'].includes(module.id) && roleId === 'super-admin')))
  .map((module) => module.id);

const adminSidebarVisible = visibleSidebarIds('admin');
assert.deepEqual(adminSidebarVisible, [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'subject-notes',
  'examination-results',
  'results',
  'communication',
  'calendar',
  'hostel-management',
  'document-management',
  'fees',
  'reports',
]);
assert.deepEqual(visibleSidebarIds('super-admin'), [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'subject-notes',
  'examination-results',
  'results',
  'communication',
  'calendar',
  'hostel-management',
  'document-management',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
]);

const footerVisible = enabled.filter((module) => module.footer).map((module) => module.id);
assert.deepEqual(footerVisible, ['settings']);

const superAdminVisible = enabled
  .filter((module) => canAccess(defaultRoles, 'super-admin', module.permission))
  .map((module) => module.id);
assert.deepEqual(superAdminVisible, [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'subject-notes',
  'examination-results',
  'results',
  'communication',
  'calendar',
  'hostel-management',
  'document-management',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
  'my-portal',
  'settings',
]);

const parentVisible = enabled.filter((module) => canAccess(defaultRoles, 'parent', module.permission)).map((module) => module.id);
assert.deepEqual(parentVisible, ['timetable', 'examination-results', 'results', 'communication', 'calendar', 'document-management', 'my-portal']);
assert.deepEqual(visibleSidebarIds('parent'), ['timetable', 'examination-results', 'results', 'communication', 'calendar', 'document-management', 'my-portal']);

const studentVisible = enabled.filter((module) => canAccess(defaultRoles, 'student', module.permission)).map((module) => module.id);
assert.deepEqual(studentVisible, ['timetable', 'examination-results', 'results', 'communication', 'my-portal']);
assert.deepEqual(visibleSidebarIds('student'), ['timetable', 'examination-results', 'results', 'communication', 'my-portal']);

const teacherVisible = enabled.filter((module) => canAccess(defaultRoles, 'teacher', module.permission)).map((module) => module.id);
assert.equal(teacherVisible.includes('my-portal'), true);
assert.equal(visibleSidebarIds('teacher').includes('my-portal'), true);

const facultyVisible = enabled.filter((module) => canAccess(defaultRoles, 'faculty', module.permission)).map((module) => module.id);
assert.equal(facultyVisible.includes('students'), true);
assert.equal(facultyVisible.includes('calendar'), true);
assert.equal(facultyVisible.includes('academics'), false);
assert.equal(facultyVisible.includes('attendance'), true);
assert.equal(facultyVisible.includes('subject-notes'), true);
assert.equal(facultyVisible.includes('examination-results'), true);
assert.equal(facultyVisible.includes('results'), true);
assert.equal(facultyVisible.includes('communication'), true);
assert.equal(facultyVisible.includes('document-management'), true);
assert.equal(facultyVisible.includes('fees'), false);
assert.equal(facultyVisible.includes('reports'), true);
assert.equal(facultyVisible.includes('my-portal'), true);
assert.equal(visibleSidebarIds('faculty').includes('my-portal'), true);

const adminVisible = enabled.filter((module) => canAccess(defaultRoles, 'admin', module.permission)).map((module) => module.id);
assert.deepEqual(adminVisible, [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'subject-notes',
  'examination-results',
  'results',
  'communication',
  'calendar',
  'hostel-management',
  'document-management',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
  'my-portal',
  'settings',
]);

const remainingDemo = enabled.filter((module) => module.status === 'demo').map((module) => module.id);
assert.deepEqual(remainingDemo, []);

console.log('Module registry tests passed.');
