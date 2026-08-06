import { api } from './client';

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, v);
  });
  const q = search.toString();
  return q ? `?${q}` : '';
}

export async function listPlacements(params) {
  const data = await api.get(`/placements${qs(params)}`);
  return data.placements || [];
}

export async function getPlacement(id) {
  const data = await api.get(`/placements/${id}`);
  return data.placement;
}

export async function createPlacement(payload) {
  const data = await api.post('/placements', payload);
  return data.placement;
}

export async function updatePlacement(id, payload) {
  const data = await api.patch(`/placements/${id}`, payload);
  return data.placement;
}

export async function archivePlacement(id) {
  const data = await api.post(`/placements/${id}/archive`, {});
  return data.placement;
}

export async function restorePlacement(id) {
  const data = await api.post(`/placements/${id}/restore`, {});
  return data.placement;
}
