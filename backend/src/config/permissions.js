// Roles + permission matrix, derived from the Product Spec §5 (roles) and §9
// (permission matrix). Permissions are `module.action` strings. Every protected
// endpoint declares the permission it needs; middleware checks the caller's role.
//
// This file is the DEFAULT source of truth. Admins can override a role's
// permission set at runtime (stored in the `rolePermissions` Firestore doc),
// which is merged on top of these defaults by the roles service.

// ── Canonical role ids ──
export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  PRINCIPAL: 'principal',
  ACCOUNTANT: 'accountant',
  RECEPTION: 'reception',
  TEACHER: 'teacher',
  PARENT: 'parent',
  STUDENT: 'student',
};

export const ROLE_LIST = [
  { id: ROLES.SUPER_ADMIN, label: 'Super Admin', description: 'Devloft internal setup, deployment, system-level users.' },
  { id: ROLES.ADMIN, label: 'Institution Admin', description: 'Full access to institution modules and settings.' },
  { id: ROLES.PRINCIPAL, label: 'Principal', description: 'Academic and management oversight.' },
  { id: ROLES.ACCOUNTANT, label: 'Accountant', description: 'Fee and payment operations.' },
  { id: ROLES.RECEPTION, label: 'Reception / Admin Staff', description: 'Admissions and student records.' },
  { id: ROLES.TEACHER, label: 'Teacher', description: 'Attendance, marks entry, assigned classes.' },
  { id: ROLES.PARENT, label: 'Parent', description: 'Mobile app user — own child data.' },
  { id: ROLES.STUDENT, label: 'Student', description: 'Mobile app user — own data.' },
];

// ── All permissions, grouped by module ──
// Actions: view, create, edit, archive, export, and module-specific verbs.
export const PERMISSIONS = {
  dashboard: ['dashboard.view'],
  students: [
    'students.view', 'students.create', 'students.edit', 'students.archive',
    'students.export', 'students.import', 'students.promote', 'students.idcard',
    'students.viewOwn', // parent/student self-view
  ],
  admissions: [
    'admissions.view', 'admissions.create', 'admissions.edit',
    'admissions.approve', 'admissions.convert',
  ],
  attendance: [
    'attendance.view', 'attendance.mark', 'attendance.edit',
    'attendance.report', 'attendance.viewOwn',
  ],
  fees: [
    'fees.view', 'fees.structure', 'fees.collect', 'fees.discount',
    'fees.receipt', 'fees.report', 'fees.remind', 'fees.viewOwn', 'fees.pay',
  ],
  academics: ['academics.view', 'academics.manage'],
  timetable: ['timetable.view', 'timetable.manage', 'timetable.viewOwn'],
  examinations: [
    'examinations.view', 'examinations.create', 'examinations.marks',
    'examinations.verify', 'examinations.viewOwn',
  ],
  results: [
    'results.view', 'results.process', 'results.publish', 'results.viewOwn',
  ],
  staff: ['staff.view', 'staff.create', 'staff.edit', 'staff.archive', 'staff.attendance', 'staff.viewOwn'],
  communication: ['communication.view', 'communication.create', 'communication.send'],
  reports: ['reports.view', 'reports.export'],
  settings: ['settings.view', 'settings.manage'],
  users: ['users.view', 'users.manage'],
  roles: ['roles.view', 'roles.manage'],
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flat();

const all = () => [...ALL_PERMISSIONS];

// ── Default role → permissions, translating the §9 matrix ──
export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: all(),
  [ROLES.ADMIN]: all(),

  [ROLES.PRINCIPAL]: [
    'dashboard.view',
    'students.view', 'students.edit', 'students.export',
    'admissions.view', 'admissions.approve',
    'attendance.view', 'attendance.report',
    'fees.view', 'fees.report',
    'academics.view',
    'timetable.view',
    'examinations.view',
    'results.view', 'results.publish',
    'staff.view', 'staff.edit',
    'communication.view', 'communication.create',
    'reports.view', 'reports.export',
    'settings.view',
    'users.view', 'roles.view',
  ],

  [ROLES.ACCOUNTANT]: [
    'dashboard.view',
    'students.view',
    'admissions.view',
    'fees.view', 'fees.structure', 'fees.collect', 'fees.discount',
    'fees.receipt', 'fees.report', 'fees.remind',
    'reports.view', 'reports.export',
  ],

  [ROLES.RECEPTION]: [
    'dashboard.view',
    'students.view', 'students.create', 'students.edit',
    'admissions.view', 'admissions.create', 'admissions.edit',
    'admissions.approve', 'admissions.convert',
    'attendance.view',
    'fees.view',
    'communication.view', 'communication.create',
    'reports.view',
  ],

  [ROLES.TEACHER]: [
    'dashboard.view',
    'students.view',
    'attendance.view', 'attendance.mark', 'attendance.edit',
    'academics.view',
    'timetable.view', 'timetable.viewOwn',
    'examinations.view', 'examinations.marks',
    'results.view',
    'staff.viewOwn',
    'communication.view', 'communication.create',
    'reports.view',
  ],

  [ROLES.PARENT]: [
    'students.viewOwn',
    'attendance.viewOwn',
    'fees.viewOwn', 'fees.pay',
    'timetable.viewOwn',
    'examinations.viewOwn',
    'results.viewOwn',
    'communication.view',
  ],

  [ROLES.STUDENT]: [
    'students.viewOwn',
    'attendance.viewOwn',
    'fees.viewOwn',
    'timetable.viewOwn',
    'examinations.viewOwn',
    'results.viewOwn',
    'communication.view',
  ],
};

export function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

export function defaultPermissionsForRole(role) {
  return DEFAULT_ROLE_PERMISSIONS[role] ? [...DEFAULT_ROLE_PERMISSIONS[role]] : [];
}
