export const permissionGroups = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    permissions: [
      ['dashboard.view', 'View dashboard'],
    ],
  },
  {
    id: 'students',
    label: 'Student Information',
    permissions: [
      ['students.view', 'View students'],
      ['students.create', 'Create students'],
      ['students.edit', 'Edit profiles'],
      ['students.archive', 'Archive/restore'],
      ['students.export', 'Export students'],
      ['students.import', 'Import students'],
      ['students.promote', 'Promote/transfer'],
      ['students.idcard', 'Generate ID cards'],
      ['students.viewOwn', 'View own student profile'],
    ],
  },
  {
    id: 'admissions',
    label: 'Admissions',
    permissions: [
      ['admissions.view', 'View admissions'],
      ['admissions.create', 'Create enquiries'],
      ['admissions.edit', 'Edit admissions and follow-ups'],
      ['admissions.approve', 'Approve/reject admissions'],
      ['admissions.convert', 'Convert admissions to students'],
    ],
  },
  {
    id: 'staff',
    label: 'Faculty & Staff',
    permissions: [
      ['staff.view', 'View faculty/staff'],
      ['staff.create', 'Create faculty/staff'],
      ['staff.edit', 'Edit faculty/staff'],
      ['staff.archive', 'Archive/restore staff'],
      ['staff.attendance', 'Mark attendance'],
      ['staff.viewOwn', 'View own staff profile'],
    ],
  },
  {
    id: 'users',
    label: 'Users & Roles',
    permissions: [
      ['users.view', 'View users'],
      ['users.manage', 'Manage users'],
      ['roles.view', 'View roles'],
      ['roles.manage', 'Manage permissions'],
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    permissions: [
      ['attendance.view', 'Attendance module'],
      ['attendance.mark', 'Mark attendance'],
      ['attendance.edit', 'Edit attendance'],
      ['attendance.report', 'View attendance reports'],
      ['attendance.viewOwn', 'View own attendance'],
    ],
  },
  {
    id: 'fees',
    label: 'Fees',
    permissions: [
      ['fees.view', 'Fees module'],
      ['fees.structure', 'Manage fee heads, structures, and assignments'],
      ['fees.collect', 'Collect fees'],
      ['fees.discount', 'Record discounts'],
      ['fees.receipt', 'View receipts'],
      ['fees.report', 'View fee reports'],
      ['fees.remind', 'Record reminder intents'],
      ['fees.viewOwn', 'View own fees'],
      ['fees.pay', 'Pay own fees'],
    ],
  },
  {
    id: 'academics',
    label: 'Academics',
    permissions: [
      ['academics.view', 'Academics module'],
      ['academics.manage', 'Manage academics'],
    ],
  },
  {
    id: 'timetable',
    label: 'Timetable',
    permissions: [
      ['timetable.view', 'Timetable module'],
      ['timetable.manage', 'Manage timetable periods and slots'],
      ['timetable.viewOwn', 'View own timetable'],
    ],
  },
  {
    id: 'examinations',
    label: 'Examinations',
    permissions: [
      ['examinations.view', 'Examinations module'],
      ['examinations.create', 'Create exams and schedules'],
      ['examinations.marks', 'Enter marks'],
      ['examinations.verify', 'Verify/unlock marks'],
      ['examinations.viewOwn', 'View own examinations'],
    ],
  },
  {
    id: 'results',
    label: 'Results',
    permissions: [
      ['results.view', 'Results module'],
      ['results.process', 'Process results'],
      ['results.publish', 'Publish/lock results'],
      ['results.viewOwn', 'View own results'],
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    permissions: [
      ['reports.view', 'Reports module'],
      ['reports.export', 'Export reports'],
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    permissions: [
      ['communication.view', 'Communication module'],
      ['communication.create', 'Create/update/archive notices and templates'],
      ['communication.send', 'Send notices'],
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    permissions: [
      ['settings.view', 'Settings module'],
      ['settings.manage', 'Manage settings'],
    ],
  },
];

export const defaultRoles = [
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Full ERP control including users, roles, and all modules.',
    locked: true,
    permissions: permissionGroups.flatMap((group) => group.permissions.map(([key]) => key)),
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Administrative ERP access for daily operations.',
    locked: false,
    permissions: permissionGroups.flatMap((group) => group.permissions.map(([key]) => key)),
  },
  {
    id: 'principal',
    name: 'Principal',
    description: 'Academic and management oversight.',
    locked: false,
    permissions: [
      'dashboard.view',
      'students.view',
      'students.edit',
      'students.export',
      'admissions.view',
      'admissions.approve',
      'attendance.view',
      'attendance.report',
      'fees.view',
      'fees.report',
      'academics.view',
      'timetable.view',
      'examinations.view',
      'results.view',
      'results.publish',
      'staff.view',
      'staff.edit',
      'communication.view',
      'communication.create',
      'reports.view',
      'reports.export',
      'settings.view',
      'users.view',
      'roles.view',
    ],
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Fee and payment operations.',
    locked: false,
    permissions: [
      'dashboard.view',
      'students.view',
      'admissions.view',
      'fees.view',
      'fees.structure',
      'fees.collect',
      'fees.discount',
      'fees.receipt',
      'fees.report',
      'fees.remind',
      'reports.view',
      'reports.export',
    ],
  },
  {
    id: 'reception',
    name: 'Reception / Admin Staff',
    description: 'Admissions and student records.',
    locked: false,
    permissions: [
      'dashboard.view',
      'students.view',
      'students.create',
      'students.edit',
      'admissions.view',
      'admissions.create',
      'admissions.edit',
      'admissions.approve',
      'admissions.convert',
      'attendance.view',
      'fees.view',
      'communication.view',
      'communication.create',
      'reports.view',
    ],
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Teacher self-service access for assigned classes and academic work.',
    locked: false,
    permissions: [
      'dashboard.view',
      'students.view',
      'attendance.view',
      'attendance.mark',
      'attendance.edit',
      'academics.view',
      'timetable.view',
      'timetable.viewOwn',
      'examinations.view',
      'examinations.marks',
      'results.view',
      'staff.viewOwn',
      'communication.view',
      'communication.create',
      'reports.view',
    ],
  },
  {
    id: 'parent',
    name: 'Parent',
    description: 'Mobile app user own child data.',
    locked: false,
    permissions: [
      'students.viewOwn',
      'attendance.viewOwn',
      'fees.viewOwn',
      'fees.pay',
      'timetable.viewOwn',
      'examinations.viewOwn',
      'results.viewOwn',
      'communication.view',
    ],
  },
  {
    id: 'student',
    name: 'Student',
    description: 'Mobile app user own data.',
    locked: false,
    permissions: [
      'students.viewOwn',
      'attendance.viewOwn',
      'fees.viewOwn',
      'timetable.viewOwn',
      'examinations.viewOwn',
      'results.viewOwn',
      'communication.view',
    ],
  },
];

export function hasPermission(role, permission) {
  return Boolean(role?.permissions?.includes(permission));
}

export function getRoleById(roles, roleId) {
  return roles.find((role) => role.id === roleId) || null;
}

export function canAccess(roles, roleId, permission) {
  if (Array.isArray(permission)) return permission.some((item) => hasPermission(getRoleById(roles, roleId), item));
  return hasPermission(getRoleById(roles, roleId), permission);
}

export function togglePermission(role, permission) {
  const permissions = new Set(role.permissions || []);
  if (permissions.has(permission)) {
    permissions.delete(permission);
  } else {
    permissions.add(permission);
  }
  return [...permissions].sort();
}

export const backendUserRoles = [
  { id: 'super-admin', label: 'Super Admin', description: 'Devloft internal setup, deployment, system-level users.' },
  { id: 'admin', label: 'Institution Admin', description: 'Full access to institution modules and settings.' },
  { id: 'principal', label: 'Principal', description: 'Academic and management oversight.' },
  { id: 'accountant', label: 'Accountant', description: 'Fee and payment operations.' },
  { id: 'reception', label: 'Reception / Admin Staff', description: 'Admissions and student records.' },
  { id: 'teacher', label: 'Teacher', description: 'Attendance, marks entry, assigned classes.' },
  { id: 'parent', label: 'Parent', description: 'Mobile app user own child data.' },
  { id: 'student', label: 'Student', description: 'Mobile app user own data.' },
];

export function roleLabel(roleId = '') {
  const found = backendUserRoles.find((role) => role.id === roleId);
  if (found) return found.label;
  return String(roleId || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function getUserId(user = {}) {
  return user.id || user.uid || '';
}

export function getUserRole(user = {}) {
  return user.role || user.roleId || '';
}

export function getUserStatus(user = {}) {
  return String(user.status || 'active').toLowerCase();
}

export function summarizeUsers(users = []) {
  return users.reduce((summary, user) => ({
    total: summary.total + 1,
    active: summary.active + (!user.archived && getUserStatus(user) === 'active' ? 1 : 0),
    archived: summary.archived + (user.archived ? 1 : 0),
    linked: summary.linked + ((user.linkedStudentIds || []).length ? 1 : 0),
  }), {
    total: 0,
    active: 0,
    archived: 0,
    linked: 0,
  });
}

export function filterBackendUsers(users = [], filters = {}) {
  const term = (filters.search || '').trim().toLowerCase();
  return users.filter((user) => {
    const role = getUserRole(user);
    const status = getUserStatus(user);
    const roleMatches = !filters.role || role === filters.role;
    const statusMatches = !filters.status || status === filters.status;
    const textMatches = !term || [user.name, user.email, user.phone, roleLabel(role), status, getUserId(user)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
    return roleMatches && statusMatches && textMatches;
  });
}

export function formatDisplayDate(value = new Date()) {
  if (!value) return '-';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
  }
  if (typeof value === 'string') {
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : formatDisplayDate(parsed);
  }
  if (value?._seconds) return formatDisplayDate(new Date(value._seconds * 1000));
  if (value?.seconds) return formatDisplayDate(new Date(value.seconds * 1000));
  return String(value);
}

export function validateUserForm(form) {
  if (!form.name?.trim()) return 'Name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) return 'Valid email is required.';
  if (!form.role && !form.roleId) return 'Role is required.';
  if (!backendUserRoles.some((role) => role.id === (form.role || form.roleId))) return 'A valid role is required.';
  if (!form.password || form.password.length < 12) return 'Password must be at least 12 characters.';
  return '';
}

export function validateUserUpdate(form) {
  if (!form.name?.trim()) return 'Name is required.';
  if (!form.role && !form.roleId) return 'Role is required.';
  if (!backendUserRoles.some((role) => role.id === (form.role || form.roleId))) return 'A valid role is required.';
  if (!form.status) return 'Status is required.';
  return '';
}


