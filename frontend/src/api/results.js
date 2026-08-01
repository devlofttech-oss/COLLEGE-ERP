import { API_BASE_URL, api, apiRequest } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listGradeSettings(params) {
  const data = await api.get(`/results/grade-settings${queryString(params)}`);
  return data.gradeSettings || [];
}

export async function saveGradeSettings(payload) {
  const data = await apiRequest('/results/grade-settings', { method: 'PUT', body: payload });
  return data.gradeSettings;
}

export async function processResults(payload) {
  return api.post('/results/process', payload);
}

export async function listResults(params) {
  const data = await api.get(`/results${queryString(params)}`);
  return data.results || [];
}

export async function publishResults(payload) {
  return api.post('/results/publish', payload);
}

export async function lockResults(payload) {
  return api.post('/results/lock', payload);
}

export async function unlockResults(payload) {
  return api.post('/results/unlock', payload);
}

export async function getReportCard(params) {
  const data = await api.get(`/results/report-card${queryString(params)}`);
  return data.reportCard;
}

export function reportCardPdfUrl(params) {
  return `${API_BASE_URL}/results/report-card/pdf${queryString(params)}`;
}

export async function getResultHistory(studentId) {
  const data = await api.get(`/results/history/${encodeURIComponent(studentId)}`);
  return data.history || [];
}
