import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listExams(params) {
  const data = await api.get(`/examinations/exams${queryString(params)}`);
  return data.exams || [];
}

export async function createExam(payload) {
  const data = await api.post('/examinations/exams', payload);
  return data.exam;
}

export async function updateExam(id, payload) {
  const data = await api.patch(`/examinations/exams/${id}`, payload);
  return data.exam;
}

export async function archiveExam(id) {
  const data = await api.post(`/examinations/exams/${id}/archive`, {});
  return data.exam;
}

export async function listExamSchedules(params) {
  const data = await api.get(`/examinations/schedules${queryString(params)}`);
  return data.schedules || [];
}

export async function createExamSchedule(payload) {
  const data = await api.post('/examinations/schedules', payload);
  return data.schedule;
}

export async function updateExamSchedule(id, payload) {
  const data = await api.patch(`/examinations/schedules/${id}`, payload);
  return data.schedule;
}

export async function archiveExamSchedule(id) {
  const data = await api.post(`/examinations/schedules/${id}/archive`, {});
  return data.schedule;
}

export async function listMarks(params) {
  const data = await api.get(`/examinations/marks${queryString(params)}`);
  return data.marks || [];
}

export async function enterMarks(payload) {
  return api.post('/examinations/marks', payload);
}

export async function verifyMarks(payload) {
  return api.post('/examinations/marks/verify', payload);
}

export async function unlockMarks(payload) {
  return api.post('/examinations/marks/unlock', payload);
}
