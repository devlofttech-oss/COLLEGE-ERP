import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function presignUpload(payload) {
  return api.post('/files/presign-upload', payload);
}

export async function presignDownload(params = {}) {
  return api.get(`/files/presign-download${queryString(params)}`);
}

export async function resolveStoredFile(params = {}) {
  return api.get(`/files/resolve${queryString(params)}`);
}

export async function deleteStoredFile(key) {
  return api.delete(`/files${queryString({ key })}`);
}

export async function uploadPresignedFile({ uploadUrl, method = 'PUT', headers = {}, file }) {
  const response = await fetch(uploadUrl, {
    method,
    headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error(response.statusText || 'File upload failed.');
  }
}
