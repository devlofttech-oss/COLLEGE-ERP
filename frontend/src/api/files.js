import { api } from './client';

export async function presignUpload(payload) {
  return api.post('/files/presign-upload', payload);
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
