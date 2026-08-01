export const permissionGroups = [
  {
    id: 'students',
    label: 'Student Information',
    permissions: [
      ['students.view', 'View students'],
      ['students.create', 'Create admissions'],
      ['students.edit', 'Edit profiles'],
      ['students.archive', 'Archive/restore'],
      ['students.documents', 'Upload documents'],
      ['students.verifyDocuments', 'Verify documents'],
      ['students.promote', 'Promote/transfer'],
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
      ['users.create', 'Create users'],
      ['users.edit', 'Edit users'],
      ['roles.view', 'View roles'],
      ['roles.edit', 'Edit permissions'],
    ],
  },
  {
    id: 'modules',
    label: 'Module Access',
    permissions: [
      ['dashboard.view', 'Dashboard module'],
      ['attendance.view', 'Attendance module'],
      ['attendance.mark', 'Mark attendance'],
      ['attendance.edit', 'Edit attendance'],
      ['attendance.report', 'View attendance reports'],
      ['attendance.viewOwn', 'View own attendance'],
      ['academicCurriculum.view', 'Academic curriculum module'],
      ['academics.view', 'Academics module'],
      ['academics.manage', 'Manage academics'],
      ['timetable.view', 'Timetable module'],
      ['timetable.manage', 'Manage timetable periods and slots'],
      ['timetable.viewOwn', 'View own timetable'],
      ['subjectNotes.view', 'Subject notes module'],
      ['subjectNotes.upload', 'Upload subject notes'],
      ['subjectNotes.edit', 'Edit subject notes'],
      ['subjectNotes.archive', 'Archive subject notes'],
      ['exams.view', 'Exams module'],
      ['exams.schedule', 'Schedule exams'],
      ['exams.assessments', 'Manage assessments'],
      ['exams.marks', 'Enter marks'],
      ['exams.results', 'Generate results'],
      ['exams.reportCards', 'Generate report cards'],
      ['fees.view', 'Fees module'],
      ['fees.structure', 'Manage fee heads, structures, and assignments'],
      ['fees.collect', 'Collect fees'],
      ['fees.discount', 'Record discounts'],
      ['fees.receipt', 'View receipts'],
      ['fees.report', 'View fee reports'],
      ['fees.remind', 'Record reminder intents'],
      ['fees.viewOwn', 'View own fees'],
      ['fees.pay', 'Pay own fees'],
      ['hostel.view', 'Hostel module'],
      ['hostel.manage', 'Manage hostel records'],
      ['financialReports.view', 'Financial reports module'],
      ['financialReports.export', 'Export financial reports'],
      ['financialReports.snapshots', 'Save financial summaries'],
      ['reports.view', 'Reports module'],
      ['notices.view', 'Communication module'],
      ['notices.create', 'Create announcements'],
      ['notices.edit', 'Edit announcements'],
      ['notices.archive', 'Archive announcements'],
      ['documents.view', 'Document management module'],
      ['documents.upload', 'Upload documents'],
      ['documents.verify', 'Verify documents'],
      ['documents.archive', 'Archive documents'],
      ['parentPortal.view', 'Parent portal'],
      ['parentPortal.viewAll', 'View all parent portal students'],
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
    permissions: [
      'dashboard.view',
      'academicCurriculum.view',
      'academics.view',
      'academics.manage',
      'students.view',
      'students.create',
      'students.edit',
      'students.documents',
      'admissions.view',
      'admissions.create',
      'admissions.edit',
      'admissions.approve',
      'admissions.convert',
      'staff.view',
      'staff.create',
      'staff.edit',
      'staff.archive',
      'staff.attendance',
      'staff.viewOwn',
      'attendance.view',
      'attendance.mark',
      'attendance.edit',
      'attendance.report',
      'attendance.viewOwn',
      'timetable.view',
      'timetable.manage',
      'timetable.viewOwn',
      'subjectNotes.view',
      'subjectNotes.upload',
      'subjectNotes.edit',
      'subjectNotes.archive',
      'exams.view',
      'exams.schedule',
      'exams.assessments',
      'exams.marks',
      'exams.results',
      'exams.reportCards',
      'fees.view',
      'fees.structure',
      'fees.collect',
      'fees.discount',
      'fees.receipt',
      'fees.report',
      'fees.remind',
      'fees.viewOwn',
      'fees.pay',
      'hostel.view',
      'hostel.manage',
      'financialReports.view',
      'financialReports.export',
      'financialReports.snapshots',
      'reports.view',
      'notices.view',
      'notices.create',
      'notices.edit',
      'notices.archive',
      'documents.view',
      'documents.upload',
      'documents.verify',
      'documents.archive',
      'settings.view',
      'settings.manage',
    ],
  },
  {
    id: 'faculty',
    name: 'Faculty',
    description: 'Academic staff access for assigned student and academic workflows.',
    locked: false,
    permissions: [
      'students.view',
      'academicCurriculum.view',
      'attendance.view',
      'attendance.mark',
      'attendance.edit',
      'attendance.report',
      'timetable.view',
      'timetable.viewOwn',
      'subjectNotes.view',
      'subjectNotes.upload',
      'subjectNotes.edit',
      'notices.view',
      'documents.view',
      'hostel.view',
      'reports.view',
    ],
  },
  {
    id: 'parent',
    name: 'Parent',
    description: 'Parent portal access for student information visibility.',
    locked: false,
    permissions: [
      'academicCurriculum.view',
      'timetable.viewOwn',
      'notices.view',
      'documents.view',
      'parentPortal.view',
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

export function canAccessFinancialReports(roles, roleId, permission = 'financialReports.view') {
  return ['admin', 'super-admin'].includes(roleId) || canAccess(roles, roleId, permission);
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

export function validateUserForm(form) {
  if (!form.name?.trim()) return 'Name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) return 'Valid email is required.';
  if (!form.roleId) return 'Role is required.';
  if (!form.password || form.password.length < 12) return 'Password must be at least 12 characters.';
  return '';
}

export function validateUserUpdate(form) {
  if (!form.name?.trim()) return 'Name is required.';
  if (!form.roleId) return 'Role is required.';
  if (!form.status) return 'Status is required.';
  return '';
}


