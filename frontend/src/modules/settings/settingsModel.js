export const emptyInstitutionSettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  academicYear: '',
  affiliation: '',
  registrationNumber: '',
};

export const emptyBrandingSettings = {
  logoKey: '',
  logoUrl: '',
  primaryColor: '#004d4d',
  secondaryColor: '#66d9cc',
  theme: '',
  receiptHeader: '',
  reportCardTemplate: '',
  idCardTemplate: '',
};

export const emptyIntegrationSettings = {
  smsSenderId: '',
  smsProvider: '',
  whatsappProvider: '',
  emailProvider: '',
  emailFrom: '',
  paymentProvider: '',
  storageProvider: '',
};

export const secretIntegrationFields = [
  'smsApiKey',
  'whatsappApiKey',
  'emailApiKey',
  'paymentKeyId',
  'paymentKeySecret',
  'fcmServerKey',
];

export const emptyBackupSettings = {
  schedule: 'daily',
  retentionDays: 7,
  externalTarget: '',
  lastBackupAt: '',
};

function normalizeTimestamp(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?._seconds) return new Date(value._seconds * 1000).toISOString();
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString();
  return String(value);
}

export function normalizeInstitutionSettings(institution = {}) {
  return {
    ...emptyInstitutionSettings,
    ...institution,
    name: institution.name || '',
    email: institution.email || '',
    phone: institution.phone || '',
    address: institution.address || '',
    academicYear: institution.academicYear || '',
    registrationNumber: institution.registrationNumber || '',
  };
}

export function normalizeInstituteSettings(institution = {}) {
  const normalized = normalizeInstitutionSettings(institution);
  return {
    ...normalized,
    instituteId: institution.instituteId || institution.code || normalized.registrationNumber || '',
    code: institution.code || institution.instituteId || normalized.registrationNumber || '',
    city: institution.city || '',
    logoUrl: institution.logoUrl || '',
    logoFileName: institution.logoFileName || '',
    status: institution.status || '',
    updatedAtText: institution.updatedAtText || '',
  };
}

export function normalizeBrandingSettings(branding = {}) {
  return {
    ...emptyBrandingSettings,
    ...branding,
    primaryColor: branding.primaryColor || emptyBrandingSettings.primaryColor,
    secondaryColor: branding.secondaryColor || emptyBrandingSettings.secondaryColor,
  };
}

export function normalizeIntegrationSettings(integrations = {}) {
  return {
    ...emptyIntegrationSettings,
    ...integrations,
  };
}

export function normalizeBackupSettings(backup = {}) {
  return {
    ...emptyBackupSettings,
    ...backup,
    retentionDays: backup.retentionDays ?? emptyBackupSettings.retentionDays,
    lastBackupAt: normalizeTimestamp(backup.lastBackupAt),
  };
}
