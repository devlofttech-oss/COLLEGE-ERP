import { loginAliases } from './loginAliases.generated';

export function normalizeLoginIdentifier(value = '') {
  return String(value).trim().toLowerCase();
}

export function phoneDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

export function isEmailIdentifier(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

export function resolveLoginEmail(identifier = '') {
  const normalized = normalizeLoginIdentifier(identifier);
  const digits = phoneDigits(identifier);

  if (!normalized) return '';
  return loginAliases[normalized] || (digits ? loginAliases[digits] : '') || normalized;
}

export function canResolveLoginIdentifier(identifier = '') {
  const normalized = normalizeLoginIdentifier(identifier);
  const digits = phoneDigits(identifier);

  if (!normalized) return false;
  return isEmailIdentifier(normalized) || Boolean(loginAliases[normalized] || (digits && loginAliases[digits]));
}
