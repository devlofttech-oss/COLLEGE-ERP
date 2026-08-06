import { api } from './client';

export async function getInstitutionConfig() {
  return api.get('/institution/config');
}

export async function listInstitutions() {
  const data = await api.get('/institutions');
  return data.institutions || [];
}

export async function createInstitution(body) {
  return api.post('/institutions', body);
}

export async function updateInstitution(id, body) {
  return api.patch(`/institutions/${id}`, body);
}

export async function setInstitutionModules(id, enabledModules) {
  return api.patch(`/institutions/${id}/modules`, { enabledModules });
}
