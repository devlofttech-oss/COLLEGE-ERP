import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listMyStudents() {
  const data = await api.get('/my/students');
  return data.students || [];
}

export async function getMyProfile(params = {}) {
  const data = await api.get(`/my/profile${queryString(params)}`);
  return data.student || null;
}

export async function getMyAttendance(params = {}) {
  return api.get(`/my/attendance${queryString(params)}`);
}

export async function getMyFees(params = {}) {
  return api.get(`/my/fees${queryString(params)}`);
}

export async function getMyTimetable(params = {}) {
  return api.get(`/my/timetable${queryString(params)}`);
}

export async function getMyExams(params = {}) {
  return api.get(`/my/exams${queryString(params)}`);
}

export async function getMyResults(params = {}) {
  return api.get(`/my/results${queryString(params)}`);
}

export async function getMyNotices(params = {}) {
  return api.get(`/my/notices${queryString(params)}`);
}

export async function getMyDownloads(params = {}) {
  return api.get(`/my/downloads${queryString(params)}`);
}

export async function getMyClasses() {
  return api.get('/my/classes');
}

export async function getMyTeachingTimetable(params = {}) {
  return api.get(`/my/teaching-timetable${queryString(params)}`);
}
