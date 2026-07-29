import { API_BASE_URL, ApiClientError, api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listStudents(params) {
  const data = await api.get(`/students${queryString(params)}`);
  return {
    students: data.students || [],
    count: data.count || 0,
  };
}

export async function getStudent(id) {
  const data = await api.get(`/students/${id}`);
  return data.student;
}

export async function createStudent(payload) {
  const data = await api.post('/students', payload);
  return data.student;
}

export async function updateStudent(id, payload) {
  const data = await api.patch(`/students/${id}`, payload);
  return data.student;
}

export async function archiveStudent(id) {
  const data = await api.post(`/students/${id}/archive`, {});
  return data.student;
}

export async function restoreStudent(id) {
  const data = await api.post(`/students/${id}/restore`, {});
  return data.student;
}

export async function bulkImportStudents(rows) {
  return api.post('/students/import', { rows });
}

export async function exportStudents(params) {
  const response = await fetch(`${API_BASE_URL}/students/export${queryString(params)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    const message = data?.message || data?.error || response.statusText || 'Export failed.';
    throw new ApiClientError(message, { status: response.status, data });
  }

  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] || 'students.csv';
  return {
    blob: await response.blob(),
    filename,
  };
}

export async function listStudentDocuments(id) {
  const data = await api.get(`/students/${id}/documents`);
  return data.documents || [];
}

export async function addStudentDocument(id, payload) {
  const data = await api.post(`/students/${id}/documents`, payload);
  return data.document;
}

export async function verifyStudentDocument(id, docId, remarks) {
  const data = await api.post(`/students/${id}/documents/${docId}/verify`, { remarks });
  return data.document;
}

export async function rejectStudentDocument(id, docId, remarks) {
  const data = await api.post(`/students/${id}/documents/${docId}/reject`, { remarks });
  return data.document;
}

export async function listPlacementHistory(id) {
  const data = await api.get(`/students/${id}/placement-history`);
  return data.history || [];
}

export async function promoteStudent(id, payload) {
  const data = await api.post(`/students/${id}/promote`, payload);
  return data.student;
}

export async function transferStudent(id, payload) {
  const data = await api.post(`/students/${id}/transfer`, payload);
  return data.student;
}

export async function getStudentIdCard(id) {
  const data = await api.get(`/students/${id}/id-card`);
  return data.idCard;
}

export function studentIdCardPdfUrl(id) {
  return `${API_BASE_URL}/students/${id}/id-card/pdf`;
}
