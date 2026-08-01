import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listNotices(params) {
  const data = await api.get(`/communication/notices${queryString(params)}`);
  return data.notices || [];
}

export async function createNotice(payload) {
  const data = await api.post('/communication/notices', payload);
  return data.notice;
}

export async function getNotice(id) {
  const data = await api.get(`/communication/notices/${id}`);
  return data.notice;
}

export async function updateNotice(id, payload) {
  const data = await api.patch(`/communication/notices/${id}`, payload);
  return data.notice;
}

export async function sendNotice(id) {
  return api.post(`/communication/notices/${id}/send`, {});
}

export async function archiveNotice(id) {
  const data = await api.post(`/communication/notices/${id}/archive`, {});
  return data.notice;
}

export async function listMessageTemplates(params) {
  const data = await api.get(`/communication/templates${queryString(params)}`);
  return data.templates || [];
}

export async function createMessageTemplate(payload) {
  const data = await api.post('/communication/templates', payload);
  return data.template;
}

export async function updateMessageTemplate(id, payload) {
  const data = await api.patch(`/communication/templates/${id}`, payload);
  return data.template;
}

export async function archiveMessageTemplate(id) {
  const data = await api.post(`/communication/templates/${id}/archive`, {});
  return data.template;
}
