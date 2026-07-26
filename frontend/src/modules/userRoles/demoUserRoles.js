import { defaultRoles } from './rolePermissions';

export const demoUsers = [
  {
    uid: 'demo-super-admin',
    name: 'ERP Super Admin',
    email: 'superadmin@college.edu',
    roleId: 'super-admin',
    status: 'Active',
    createdAtText: '18 Jun 2026',
  },
  {
    uid: 'demo-admin',
    name: 'College Admin',
    email: 'admin@college.edu',
    roleId: 'admin',
    status: 'Active',
    createdAtText: '18 Jun 2026',
  },
  {
    uid: 'demo-faculty',
    name: 'Faculty User',
    email: 'faculty@college.edu',
    roleId: 'faculty',
    status: 'Active',
    createdAtText: '18 Jun 2026',
  },
];

export const demoRoles = defaultRoles;
