import { api } from './client';

export async function loginSession({ email, password }) {
  const data = await api.post('/auth/login', { email, password });
  return data.user;
}

export async function getCurrentSession() {
  const data = await api.get('/auth/me');
  return data.user;
}

export async function logoutSession() {
  await api.post('/auth/logout', {});
}

export async function requestPasswordReset(email) {
  return api.post('/auth/password-reset', { email });
}

export async function logoutEverywhere() {
  await api.post('/auth/logout-everywhere', {});
}
