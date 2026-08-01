import { API_BASE_URL, ApiClientError, api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function listReports() {
  const data = await api.get('/reports');
  return data.reports || [];
}

export async function runReport(name, params = {}) {
  return api.get(`/reports/${encodeURIComponent(name)}${queryString(params)}`);
}

export async function exportReport(name, params = {}) {
  const response = await fetch(`${API_BASE_URL}/reports/${encodeURIComponent(name)}/export${queryString(params)}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '');
    const message = data?.message || data?.error || response.statusText || 'Report export failed.';
    throw new ApiClientError(message, { status: response.status, data });
  }

  const disposition = response.headers.get('content-disposition') || '';
  const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] || `${name}.csv`;
  return {
    blob: await response.blob(),
    filename,
  };
}
