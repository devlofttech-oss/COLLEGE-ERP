import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listStaff(params) {
  const data = await api.get(`/staff${queryString(params)}`);
  return {
    staff: data.staff || [],
    count: data.count || 0,
  };
}

export async function getStaff(id) {
  const data = await api.get(`/staff/${id}`);
  return data.staff;
}

export async function createStaff(payload) {
  const data = await api.post('/staff', payload);
  return data.staff;
}

export async function updateStaff(id, payload) {
  const data = await api.patch(`/staff/${id}`, payload);
  return data.staff;
}

export async function archiveStaff(id) {
  const data = await api.post(`/staff/${id}/archive`, {});
  return data.staff;
}

export async function restoreStaff(id) {
  const data = await api.post(`/staff/${id}/restore`, {});
  return data.staff;
}

export async function listDepartments() {
  const data = await api.get('/staff/departments');
  return data.departments || [];
}

export async function createDepartment(payload) {
  const data = await api.post('/staff/departments', payload);
  return data.department;
}

export async function updateDepartment(id, payload) {
  const data = await api.patch(`/staff/departments/${id}`, payload);
  return data.department;
}

export async function archiveDepartment(id) {
  const data = await api.post(`/staff/departments/${id}/archive`, {});
  return data.department;
}

export async function listStaffDocuments(id) {
  const data = await api.get(`/staff/${id}/documents`);
  return data.documents || [];
}

export async function addStaffDocument(id, payload) {
  const data = await api.post(`/staff/${id}/documents`, payload);
  return data.document;
}

export async function verifyStaffDocument(id, docId, remarks) {
  const data = await api.post(`/staff/${id}/documents/${docId}/verify`, { remarks });
  return data.document;
}

export async function rejectStaffDocument(id, docId, remarks) {
  const data = await api.post(`/staff/${id}/documents/${docId}/reject`, { remarks });
  return data.document;
}

export async function createStaffLogin(id, payload) {
  return api.post(`/staff/${id}/create-login`, payload);
}
