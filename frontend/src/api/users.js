import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listUsers(params) {
  const data = await api.get(`/users${queryString(params)}`);
  return data.users || [];
}

export async function getUser(uid) {
  const data = await api.get(`/users/${uid}`);
  return data.user;
}

export async function createUser(payload) {
  const data = await api.post('/users', payload);
  return data.user;
}

export async function updateUser(uid, payload) {
  const data = await api.patch(`/users/${uid}`, payload);
  return data.user;
}

export async function changeUserRole(uid, role) {
  const data = await api.patch(`/users/${uid}/role`, { role });
  return data.user;
}

export async function setLinkedStudents(uid, studentIds) {
  const data = await api.patch(`/users/${uid}/linked-students`, { studentIds });
  return data.user;
}

export async function archiveUser(uid) {
  const data = await api.post(`/users/${uid}/archive`, {});
  return data.user;
}

export async function restoreUser(uid) {
  const data = await api.post(`/users/${uid}/restore`, {});
  return data.user;
}
