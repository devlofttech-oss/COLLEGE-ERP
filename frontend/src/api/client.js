const DEFAULT_API_BASE_URL = import.meta.env.DEV ? 'http://localhost:4000/api' : '/api';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');

export class ApiClientError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...rest } = options;
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const message = data?.message || data?.error || response.statusText || 'Request failed.';
    throw new ApiClientError(message, { status: response.status, data });
  }

  return data;
}

export const api = {
  get: (path, options) => apiRequest(path, { method: 'GET', ...options }),
  post: (path, body, options) => apiRequest(path, { method: 'POST', body, ...options }),
  patch: (path, body, options) => apiRequest(path, { method: 'PATCH', body, ...options }),
  delete: (path, options) => apiRequest(path, { method: 'DELETE', ...options }),
};
