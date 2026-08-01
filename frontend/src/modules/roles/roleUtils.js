export function labelize(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function sortPermissions(permissions = []) {
  return [...new Set(Array.isArray(permissions) ? permissions : [])].sort();
}

export function samePermissionSet(first = [], second = []) {
  const normalizedFirst = sortPermissions(first);
  const normalizedSecond = sortPermissions(second);
  if (normalizedFirst.length !== normalizedSecond.length) return false;
  return normalizedFirst.every((permission, index) => permission === normalizedSecond[index]);
}

export function hasRoleOverride(role = {}) {
  return !samePermissionSet(role.permissions || [], role.defaultPermissions || []);
}

export function groupPermissions(catalog = {}) {
  return Object.entries(catalog.groups || {}).map(([id, permissions]) => ({
    id,
    label: labelize(id),
    permissions: Array.isArray(permissions) ? permissions : [],
  }));
}

export function permissionLabel(permission = '') {
  const [module, action] = String(permission).split('.');
  return [labelize(module), labelize(action)].filter(Boolean).join(' ');
}

export function permissionAction(permission = '') {
  const action = String(permission).split('.')[1] || permission;
  return labelize(action);
}

export function togglePermission(permissions = [], permission) {
  const next = new Set(Array.isArray(permissions) ? permissions : []);
  if (next.has(permission)) next.delete(permission);
  else next.add(permission);
  return [...next].sort();
}

export function filterRoles(roles = [], search = '') {
  const term = String(search || '').trim().toLowerCase();
  if (!term) return roles;
  return roles.filter((role) => [
    role.id,
    role.label,
    role.description,
    ...(role.permissions || []),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(term)));
}

export function countRoleGroupPermissions(role = {}, permissions = []) {
  const current = new Set(role.permissions || []);
  return permissions.reduce((count, permission) => count + (current.has(permission) ? 1 : 0), 0);
}

export function countDraftGroupPermissions(draftPermissions = [], groupPermissionsList = []) {
  const current = new Set(draftPermissions || []);
  return groupPermissionsList.reduce((count, permission) => count + (current.has(permission) ? 1 : 0), 0);
}

export function summarizeRoles(roles = [], catalog = {}) {
  return roles.reduce((summary, role) => ({
    roles: summary.roles + 1,
    customized: summary.customized + (hasRoleOverride(role) ? 1 : 0),
    defaults: summary.defaults + (!hasRoleOverride(role) ? 1 : 0),
    permissions: summary.permissions,
    groups: summary.groups,
  }), {
    roles: 0,
    customized: 0,
    defaults: 0,
    permissions: Array.isArray(catalog.all) ? catalog.all.length : 0,
    groups: Object.keys(catalog.groups || {}).length,
  });
}

export function validatePermissionSet(permissions = [], catalog = {}) {
  if (!Array.isArray(permissions)) return 'Permissions must be an array.';
  const allowed = new Set(catalog.all || []);
  const invalid = permissions.filter((permission) => !allowed.has(permission));
  if (invalid.length) return `Unknown permissions: ${invalid.join(', ')}`;
  return '';
}
