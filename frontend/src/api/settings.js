import { api, apiRequest } from './client';

export async function getInstitutionSettings() {
  const data = await api.get('/settings/institution');
  return data.institution || {};
}

export async function updateInstitutionSettings(payload) {
  const data = await apiRequest('/settings/institution', { method: 'PUT', body: payload });
  return data.institution || {};
}

export async function getBrandingSettings() {
  const data = await api.get('/settings/branding');
  return data.branding || {};
}

export async function updateBrandingSettings(payload) {
  const data = await apiRequest('/settings/branding', { method: 'PUT', body: payload });
  return data.branding || {};
}

export async function getIntegrationSettings() {
  const data = await api.get('/settings/integrations');
  return data.integrations || {};
}

export async function updateIntegrationSettings(payload) {
  const data = await apiRequest('/settings/integrations', { method: 'PUT', body: payload });
  return data.integrations || {};
}

export async function getBackupSettings() {
  const data = await api.get('/settings/backup');
  return data.backup || {};
}

export async function updateBackupSettings(payload) {
  const data = await apiRequest('/settings/backup', { method: 'PUT', body: payload });
  return data.backup || {};
}
