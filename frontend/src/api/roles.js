import { api, apiRequest } from './client';

export async function listRoles() {
  const data = await api.get('/roles');
  return data.roles || [];
}

export async function getPermissionCatalog() {
  const data = await api.get('/roles/permissions/catalog');
  return {
    groups: data.groups || {},
    all: data.all || [],
  };
}

export async function updateRolePermissions(role, permissions) {
  return apiRequest(`/roles/${role}/permissions`, { method: 'PUT', body: { permissions } });
}

export async function resetRolePermissions(role) {
  return api.delete(`/roles/${role}/permissions`);
}
