import { api } from './client';

// Current tenant config from the backend: which modules are enabled for this
// institution + its branding. Drives sidebar visibility and app name/logo.
export async function getInstitutionConfig() {
  return api.get('/institution/config');
}
