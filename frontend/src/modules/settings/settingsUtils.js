import { secretIntegrationFields } from './settingsModel.js';

export function formatDisplayDate(value = new Date()) {
  if (!value) return '-';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }
  if (typeof value === 'string') {
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : formatDisplayDate(parsed);
  }
  if (value?._seconds) return formatDisplayDate(new Date(value._seconds * 1000));
  if (value?.seconds) return formatDisplayDate(new Date(value.seconds * 1000));
  return String(value);
}

export function labelize(value = '') {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function isValidEmail(value = '') {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function countConfiguredSecrets(integrations = {}) {
  return secretIntegrationFields.reduce((total, field) => total + (integrations[`${field}Set`] ? 1 : 0), 0);
}

export function summarizeSettings(institution = {}, branding = {}, integrations = {}, backup = {}) {
  const providerFields = ['smsProvider', 'whatsappProvider', 'emailProvider', 'paymentProvider', 'storageProvider'];
  return {
    institutionConfigured: Boolean(institution.name && institution.email),
    academicYear: institution.academicYear || 'Not Set',
    brandingConfigured: Boolean(branding.logoKey || branding.logoUrl || branding.primaryColor || branding.secondaryColor),
    providersConfigured: providerFields.filter((field) => integrations[field]).length,
    secretsConfigured: countConfiguredSecrets(integrations),
    backupSchedule: backup.schedule || 'daily',
    retentionDays: backup.retentionDays ?? 7,
  };
}

export function normalizeHealthStatus(status = {}) {
  return {
    status: status.status || '',
    service: status.service || '',
    firebase: Boolean(status.firebase),
    r2: Boolean(status.r2),
    time: status.time || '',
    message: status.message || '',
  };
}

export function summarizeHealthStatus(status = {}) {
  const normalized = normalizeHealthStatus(status);
  const checks = [normalized.status === 'ok', normalized.firebase, normalized.r2];
  return {
    backendReady: checks[0],
    servicesReady: checks.every(Boolean),
    checksReady: checks.filter(Boolean).length,
    totalChecks: checks.length,
  };
}

export function validateInstitutionSettings(form = {}) {
  if (!form.name?.trim()) return 'Institution name is required.';
  if (form.email && !isValidEmail(form.email)) return 'Valid institution email is required.';
  return '';
}

export function validateBrandingSettings(form = {}) {
  const colorPattern = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  if (form.primaryColor && !colorPattern.test(form.primaryColor)) return 'Primary color must be a hex value.';
  if (form.secondaryColor && !colorPattern.test(form.secondaryColor)) return 'Secondary color must be a hex value.';
  return '';
}

export function validateIntegrationsSettings(form = {}) {
  if (form.emailFrom && !isValidEmail(form.emailFrom)) return 'Valid sender email is required.';
  return '';
}

export function validateBackupSettings(form = {}) {
  if (!form.schedule?.trim()) return 'Backup schedule is required.';
  if (form.retentionDays !== '' && Number(form.retentionDays) < 0) return 'Retention days cannot be negative.';
  return '';
}

export function toDateTimeInputValue(value = '') {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 16);
  const offset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
}
