import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listPeriods() {
  const data = await api.get('/timetable/periods');
  return data.periods || [];
}

export async function createPeriod(payload) {
  const data = await api.post('/timetable/periods', payload);
  return data.period;
}

export async function updatePeriod(id, payload) {
  const data = await api.patch(`/timetable/periods/${id}`, payload);
  return data.period;
}

export async function archivePeriod(id) {
  const data = await api.post(`/timetable/periods/${id}/archive`, {});
  return data.period;
}

export async function getClassTimetable(params) {
  const data = await api.get(`/timetable/class${queryString(params)}`);
  return data.timetable || {};
}

export async function getTeacherTimetable(params) {
  const data = await api.get(`/timetable/teacher${queryString(params)}`);
  return data.timetable || {};
}

export async function listTimetableEntries(params) {
  const data = await api.get(`/timetable/entries${queryString(params)}`);
  return data.entries || [];
}

export async function createTimetableEntry(payload, options = {}) {
  const data = await api.post(`/timetable/entries${queryString({ force: options.force ? 'true' : '' })}`, payload);
  return data;
}

export async function updateTimetableEntry(id, payload, options = {}) {
  const data = await api.patch(`/timetable/entries/${id}${queryString({ force: options.force ? 'true' : '' })}`, payload);
  return data;
}

export async function archiveTimetableEntry(id) {
  const data = await api.post(`/timetable/entries/${id}/archive`, {});
  return data.entry;
}
