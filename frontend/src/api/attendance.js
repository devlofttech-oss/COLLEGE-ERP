import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listStudentAttendance(params) {
  const data = await api.get(`/attendance${queryString(params)}`);
  return data.records || [];
}

export async function markStudentAttendance(payload) {
  return api.post('/attendance/mark', payload);
}

export async function listStaffAttendance(params) {
  const data = await api.get(`/attendance/staff${queryString(params)}`);
  return data.records || [];
}

export async function markStaffAttendance(payload) {
  return api.post('/attendance/staff/mark', payload);
}

export async function getDailyAttendanceReport(params) {
  return api.get(`/attendance/reports/daily${queryString(params)}`);
}

export async function getMonthlyAttendanceReport(params) {
  return api.get(`/attendance/reports/monthly${queryString(params)}`);
}

export async function getStudentAttendancePercentage(params) {
  return api.get(`/attendance/reports/student-percentage${queryString(params)}`);
}
