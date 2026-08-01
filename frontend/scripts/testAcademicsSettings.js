import assert from 'node:assert/strict';
import {
  buildClassKey,
  filterAcademicItems,
  summarizeAcademics,
  validateBatch,
  validateCalendarEvent,
  validateProgram,
  validateSubject,
} from '../src/modules/academics/academicUtils.js';
import {
  countConfiguredSecrets,
  formatDisplayDate,
  summarizeSettings,
  toDateTimeInputValue,
  validateBackupSettings,
  validateBrandingSettings,
  validateInstitutionSettings,
  validateIntegrationsSettings,
} from '../src/modules/settings/settingsUtils.js';
import {
  normalizeBackupSettings,
  normalizeBrandingSettings,
  normalizeInstituteSettings,
  normalizeInstitutionSettings,
  normalizeIntegrationSettings,
} from '../src/modules/settings/settingsModel.js';

assert.equal(buildClassKey({ className: 'Class XII', section: 'A' }), 'Class XII - A');
assert.deepEqual(summarizeAcademics([{}], [{}, {}], [{}], [{ status: 'Published' }, { status: 'Draft' }]), {
  programs: 1,
  subjects: 2,
  batches: 1,
  publishedEvents: 1,
});
assert.equal(filterAcademicItems([{ name: 'Science' }, { name: 'Commerce' }], 'sci').length, 1);
assert.equal(validateProgram({}), 'Program name is required.');
assert.equal(validateProgram({ name: 'Science', code: 'SCI', academicYear: '2026-2027' }), '');
assert.equal(validateSubject({}), 'Subject name is required.');
assert.equal(validateSubject({ subjectName: 'Physics', subjectCode: 'PHY', programName: 'Science' }), '');
assert.equal(validateBatch({}), 'Class name is required.');
assert.equal(validateBatch({ className: 'Class XII', section: 'A', programName: 'Science' }), '');
assert.equal(validateCalendarEvent({}), 'Event title is required.');
assert.equal(validateCalendarEvent({ title: 'Orientation', eventDate: '2026-06-01', eventType: 'Academic' }), '');

assert.deepEqual(
  summarizeSettings(
    { name: 'College', email: 'admin@college.edu', academicYear: '2026-2027' },
    { primaryColor: '#004d4d' },
    { smsProvider: 'twilio', emailApiKeySet: true },
    { schedule: 'weekly', retentionDays: 14 },
  ),
  {
    institutionConfigured: true,
    academicYear: '2026-2027',
    brandingConfigured: true,
    providersConfigured: 1,
    secretsConfigured: 1,
    backupSchedule: 'weekly',
    retentionDays: 14,
  }
);
assert.equal(formatDisplayDate('2026-06-01'), '01 Jun 2026');
assert.equal(toDateTimeInputValue('2026-06-01T10:30:00.000Z').length, 16);
assert.equal(countConfiguredSecrets({ smsApiKeySet: true, emailApiKeySet: false, paymentKeySecretSet: true }), 2);
assert.equal(normalizeInstitutionSettings({ name: 'DB College', registrationNumber: 'DBC' }).name, 'DB College');
assert.equal(normalizeInstituteSettings({ name: 'DB College', registrationNumber: 'DBC' }).instituteId, 'DBC');
assert.equal(normalizeBrandingSettings({}).primaryColor, '#004d4d');
assert.equal(normalizeIntegrationSettings({ smsProvider: 'twilio' }).smsProvider, 'twilio');
assert.equal(normalizeBackupSettings({}).schedule, 'daily');
assert.equal(validateInstitutionSettings({}), 'Institution name is required.');
assert.equal(validateInstitutionSettings({ name: 'College', email: 'bad' }), 'Valid institution email is required.');
assert.equal(validateInstitutionSettings({ name: 'College', email: 'admin@college.edu' }), '');
assert.equal(validateBrandingSettings({ primaryColor: 'teal' }), 'Primary color must be a hex value.');
assert.equal(validateBrandingSettings({ primaryColor: '#004d4d', secondaryColor: '#66d9cc' }), '');
assert.equal(validateIntegrationsSettings({ emailFrom: 'bad' }), 'Valid sender email is required.');
assert.equal(validateIntegrationsSettings({ emailFrom: 'admin@college.edu' }), '');
assert.equal(validateBackupSettings({}), 'Backup schedule is required.');
assert.equal(validateBackupSettings({ schedule: 'daily', retentionDays: -1 }), 'Retention days cannot be negative.');
assert.equal(validateBackupSettings({ schedule: 'daily', retentionDays: 7 }), '');

console.log('Academics and settings tests passed.');
