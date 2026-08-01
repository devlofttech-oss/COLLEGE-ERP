import assert from 'node:assert/strict';
import { getCanonicalModulePath, getEnabledModules, getModuleById, getModuleByPath, moduleRegistry, sortModulesByDisplayOrder } from '../src/modules/moduleRegistry.js';
import { canAccess, defaultRoles } from '../src/modules/userRoles/rolePermissions.js';

const enabled = getEnabledModules();
assert.equal(enabled.every((module) => module.status !== 'disabled'), true);
assert.deepEqual(moduleRegistry.map((module) => module.id), [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
  'my-portal',
  'settings',
]);

assert.equal(getModuleById('dashboard').label, 'Dashboard');
assert.equal(getModuleById('students').permission, 'students.view');
assert.deepEqual(getModuleById('timetable').permission, ['timetable.view', 'timetable.viewOwn']);
assert.deepEqual(getModuleById('examination-results').permission, ['examinations.view', 'examinations.viewOwn']);
assert.deepEqual(getModuleById('results').permission, ['results.view', 'results.viewOwn']);
assert.equal(getModuleById('fees').permission, 'fees.view');
assert.equal(getModuleById('files').path, '/modules/files');
assert.equal(getModuleById('files').permission, undefined);
assert.equal(getModuleById('communication').permission, 'communication.view');
assert.equal(getModuleById('user-roles').label, 'Users');
assert.equal(getModuleById('roles').permission, 'roles.view');
assert.equal(getModuleById('notice-board').id, 'communication');
assert.equal(getModuleById('financial-reports').id, 'reports');
assert.equal(getModuleById('parent-portal').id, 'my-portal');
assert.equal(getModuleById('document-management').id, 'files');
assert.equal(getModuleById('calendar'), null);
assert.equal(getModuleById('subject-notes'), null);
assert.equal(getModuleById('hostel-management'), null);
assert.equal(getModuleByPath('/modules/notice-board').id, 'communication');
assert.equal(getModuleByPath('/modules/financial-reports').id, 'reports');
assert.equal(getModuleByPath('/modules/parent-portal').id, 'my-portal');
assert.equal(getModuleByPath('/modules/document-management').id, 'files');
assert.equal(getModuleByPath('/modules/calendar'), null);
assert.equal(getCanonicalModulePath('notice-board'), '/modules/communication');
assert.equal(getCanonicalModulePath('financial-reports'), '/modules/reports');
assert.equal(getCanonicalModulePath('parent-portal'), '/modules/my-portal');
assert.equal(getCanonicalModulePath('document-management'), '/modules/files');
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

const modulesWithoutPermission = moduleRegistry.filter((module) => !module.permission).map((module) => module.id);
assert.deepEqual(modulesWithoutPermission, ['files']);

const canViewModule = (roleId, module) => !module.permission || canAccess(defaultRoles, roleId, module.permission);

const visibleSidebarIds = (roleId) => sortModulesByDisplayOrder(enabled
  .filter((module) => canViewModule(roleId, module))
  .filter((module) => !module.footer)
  .filter((module) => !module.hideFromSidebar || (module.id === 'dashboard' && ['admin', 'super-admin'].includes(roleId)) || (module.id === 'my-portal' && ['parent', 'student', 'teacher'].includes(roleId)) || (!['dashboard', 'my-portal'].includes(module.id) && roleId === 'super-admin')))
  .map((module) => module.id);

assert.deepEqual(visibleSidebarIds('admin'), [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
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
  'examination-results',
  'results',
  'communication',
  'files',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
]);

const footerVisible = enabled.filter((module) => module.footer).map((module) => module.id);
assert.deepEqual(footerVisible, ['settings']);

const superAdminVisible = enabled
  .filter((module) => canViewModule('super-admin', module))
  .map((module) => module.id);
assert.deepEqual(superAdminVisible, [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
  'fees',
  'reports',
  'academics',
  'user-roles',
  'roles',
  'my-portal',
  'settings',
]);

const parentVisible = enabled.filter((module) => canViewModule('parent', module)).map((module) => module.id);
assert.deepEqual(parentVisible, ['timetable', 'examination-results', 'results', 'communication', 'files', 'my-portal']);
assert.deepEqual(visibleSidebarIds('parent'), ['timetable', 'examination-results', 'results', 'communication', 'files', 'my-portal']);

const studentVisible = enabled.filter((module) => canViewModule('student', module)).map((module) => module.id);
assert.deepEqual(studentVisible, ['timetable', 'examination-results', 'results', 'communication', 'files', 'my-portal']);
assert.deepEqual(visibleSidebarIds('student'), ['timetable', 'examination-results', 'results', 'communication', 'files', 'my-portal']);

const teacherVisible = enabled.filter((module) => canViewModule('teacher', module)).map((module) => module.id);
assert.deepEqual(teacherVisible, [
  'dashboard',
  'students',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
  'reports',
  'academics',
  'my-portal',
]);
assert.deepEqual(visibleSidebarIds('teacher'), [
  'students',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
  'reports',
  'my-portal',
]);

const adminVisible = enabled.filter((module) => canViewModule('admin', module)).map((module) => module.id);
assert.deepEqual(adminVisible, [
  'dashboard',
  'students',
  'admissions',
  'faculty-staff',
  'attendance',
  'timetable',
  'examination-results',
  'results',
  'communication',
  'files',
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
