const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const isBrowser = typeof window !== 'undefined';
const isLocalBrowser = isBrowser && LOCAL_HOSTNAMES.has(window.location.hostname);
const DEFAULT_API_BASE_URL = isLocalBrowser ? 'http://localhost:4000/api' : '/api';

function shouldIgnoreConfiguredBaseUrl(value) {
  if (!value || !isBrowser || isLocalBrowser) return false;
  try {
    const url = new URL(value, window.location.origin);
    return LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
const effectiveApiBaseUrl = shouldIgnoreConfiguredBaseUrl(configuredApiBaseUrl)
  ? DEFAULT_API_BASE_URL
  : configuredApiBaseUrl || DEFAULT_API_BASE_URL;

export const API_BASE_URL = effectiveApiBaseUrl.replace(/\/$/, '');

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
    const nestedError = data?.error;
    const message =
      data?.message ||
      nestedError?.message ||
      (typeof nestedError === 'string' ? nestedError : '') ||
      response.statusText ||
      'Request failed.';
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
