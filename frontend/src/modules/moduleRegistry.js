import {
  BadgeCheck,
  Bell,
  BarChart3,
  BookOpen,
  Briefcase,
  Files,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

export const moduleDisplayOrder = [
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
  'placements',
  'reports',
  'academics',
  'user-roles',
  'roles',
  'my-portal',
  'settings',
];

const moduleIdAliases = {
  'notice-board': 'communication',
  'financial-reports': 'reports',
  'parent-portal': 'my-portal',
  'document-management': 'files',
};

const modulePathAliases = {
  '/modules/notice-board': '/modules/communication',
  '/modules/financial-reports': '/modules/reports',
  '/modules/parent-portal': '/modules/my-portal',
  '/modules/document-management': '/modules/files',
};

const displayOrder = moduleDisplayOrder.reduce((map, id, index) => {
  map[id] = index;
  return map;
}, {});

export const moduleRegistry = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    group: 'Daily Work',
    icon: LayoutDashboard,
    status: 'active',
    permission: 'dashboard.view',
    hideFromSidebar: true,
  },
  {
    id: 'students',
    label: 'Students',
    path: '/students',
    group: 'Daily Work',
    icon: GraduationCap,
    status: 'active',
    permission: 'students.view',
  },
  {
    id: 'admissions',
    label: 'Admissions',
    path: '/modules/admissions',
    group: 'Daily Work',
    icon: UserPlus,
    status: 'active',
    permission: 'admissions.view',
  },
  {
    id: 'faculty-staff',
    label: 'Faculty',
    path: '/modules/faculty-staff',
    group: 'Daily Work',
    icon: Users,
    status: 'active',
    permission: 'staff.view',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    path: '/modules/attendance',
    group: 'Daily Work',
    icon: Bell,
    status: 'active',
    permission: 'attendance.view',
  },
  {
    id: 'timetable',
    label: 'Timetable',
    path: '/modules/timetable',
    group: 'Daily Work',
    icon: BookOpen,
    status: 'active',
    permission: ['timetable.view', 'timetable.viewOwn'],
  },
  {
    id: 'examination-results',
    label: 'Exams',
    path: '/modules/examination-results',
    group: 'Daily Work',
    icon: TrendingUp,
    status: 'active',
    permission: ['examinations.view', 'examinations.viewOwn'],
  },
  {
    id: 'results',
    label: 'Results',
    path: '/modules/results',
    group: 'Daily Work',
    icon: BadgeCheck,
    status: 'active',
    permission: ['results.view', 'results.viewOwn'],
  },
  {
    id: 'communication',
    label: 'Communication',
    path: '/modules/communication',
    group: 'Daily Work',
    icon: MessageSquare,
    status: 'active',
    permission: 'communication.view',
  },
  {
    id: 'files',
    label: 'Files',
    path: '/modules/files',
    group: 'Daily Work',
    icon: Files,
    status: 'active',
  },
  {
    id: 'fees',
    label: 'Payment',
    path: '/modules/fees',
    group: 'Daily Work',
    icon: Wallet,
    status: 'active',
    permission: 'fees.view',
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/modules/reports',
    group: 'Daily Work',
    icon: BarChart3,
    status: 'active',
    permission: 'reports.view',
  },
  {
    id: 'academics',
    label: 'Academics',
    path: '/modules/academics',
    group: 'Admin Setup',
    icon: GraduationCap,
    status: 'active',
    permission: 'academics.view',
    hideFromSidebar: true,
  },
  {
    id: 'user-roles',
    label: 'Users',
    path: '/modules/user-roles',
    group: 'Admin Setup',
    icon: Users,
    status: 'active',
    permission: 'users.view',
    hideFromSidebar: true,
  },
  {
    id: 'roles',
    label: 'Roles',
    path: '/modules/roles',
    group: 'Admin Setup',
    icon: ShieldCheck,
    status: 'active',
    permission: 'roles.view',
    hideFromSidebar: true,
  },
  {
    id: 'my-portal',
    label: 'My Portal',
    path: '/modules/my-portal',
    group: 'My Portal',
    icon: UserRound,
    status: 'active',
    permission: [
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
    ],
    hideFromSidebar: true,
  },
  {
    id: 'placements',
    label: 'Placements',
    path: '/modules/placements',
    group: 'Daily Work',
    icon: Briefcase,
    status: 'active',
    permission: 'placements.manage',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/modules/settings',
    group: 'Admin Setup',
    icon: Settings,
    status: 'active',
    permission: 'settings.view',
    footer: true,
  },
];

export function getEnabledModules() {
  return moduleRegistry.filter((module) => module.status !== 'disabled');
}

export function sortModulesByDisplayOrder(modules = []) {
  return [...modules].sort((first, second) => {
    const firstOrder = displayOrder[first.id] ?? 999;
    const secondOrder = displayOrder[second.id] ?? 999;
    return firstOrder - secondOrder;
  });
}

export function getModuleById(id) {
  const resolvedId = moduleIdAliases[id] || id;
  return moduleRegistry.find((module) => module.id === resolvedId) || null;
}

export function getModuleByPath(path) {
  const resolvedPath = modulePathAliases[path] || path;
  return moduleRegistry.find((module) => module.path === resolvedPath) || null;
}

export function getCanonicalModulePath(id) {
  return getModuleById(id)?.path || null;
}

// Maps a frontend module id to its backend module id (for /api/institution/config
// enabledModules gating). null = no backend equivalent → always shown (core/admin
// or frontend-only extras).
export const backendModuleId = {
  dashboard: 'dashboard',
  students: 'students',
  admissions: 'admissions',
  'faculty-staff': 'staff',
  attendance: 'attendance',
  timetable: 'timetable',
  'examination-results': 'examinations',
  results: 'results',
  communication: 'communication',
  files: null,
  fees: 'fees',
  placements: 'placements',
  reports: 'reports',
  academics: 'academics',
  'user-roles': null,
  roles: null,
  'my-portal': null,
  settings: 'settings',
};

// Fail-safe: with no enabledModules (config missing/unreachable) everything shows,
// so tenant gating can never accidentally hide the whole app.
export function isModuleEnabledForInstitution(frontendId, enabledModules) {
  if (!Array.isArray(enabledModules)) return true;
  const backendId = backendModuleId[frontendId];
  if (backendId == null) return true;
  return enabledModules.includes(backendId);
}

