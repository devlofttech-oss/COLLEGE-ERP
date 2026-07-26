export const demoRoleByEmail = {
  'superadmin@college.edu': 'super-admin',
  'admin@college.edu': 'admin',
  'faculty@college.edu': 'faculty',
  'parent.vivek@example.com': 'parent',
};

export function getFallbackRoleId(email) {
  return demoRoleByEmail[email?.toLowerCase()] || 'parent';
}
