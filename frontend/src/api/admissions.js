import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listAdmissions(params) {
  const data = await api.get(`/admissions${queryString(params)}`);
  return {
    admissions: data.admissions || [],
    count: data.count || 0,
  };
}

export async function getAdmission(id) {
  const data = await api.get(`/admissions/${id}`);
  return data.admission;
}

export async function createAdmission(payload) {
  const data = await api.post('/admissions', payload);
  return data.admission;
}

export async function updateAdmission(id, payload) {
  const data = await api.patch(`/admissions/${id}`, payload);
  return data.admission;
}

export async function listAdmissionFollowups(id) {
  const data = await api.get(`/admissions/${id}/followups`);
  return data.followups || [];
}

export async function addAdmissionFollowup(id, payload) {
  const data = await api.post(`/admissions/${id}/followups`, payload);
  return data.followup;
}

export async function moveAdmissionToApplication(id) {
  const data = await api.post(`/admissions/${id}/to-application`, {});
  return data.admission;
}

export async function approveAdmission(id, payload) {
  const data = await api.post(`/admissions/${id}/approve`, payload);
  return data.admission;
}

export async function rejectAdmission(id, payload) {
  const data = await api.post(`/admissions/${id}/reject`, payload);
  return data.admission;
}

export async function convertAdmissionToStudent(id, payload) {
  return api.post(`/admissions/${id}/convert`, payload);
}

export async function archiveAdmission(id) {
  const data = await api.post(`/admissions/${id}/archive`, {});
  return data.admission;
}

export async function restoreAdmission(id) {
  const data = await api.post(`/admissions/${id}/restore`, {});
  return data.admission;
}
