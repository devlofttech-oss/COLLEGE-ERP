import { api } from './client';

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getDashboardOverview() {
  return api.get('/dashboard/overview');
}

export async function listRecentDashboardActivities(params = {}) {
  const data = await api.get(`/dashboard/recent-activities${queryString(params)}`);
  return data.activities || [];
}
