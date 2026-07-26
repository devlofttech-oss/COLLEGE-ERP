export function formatDisplayDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function summarizeSettings(institute = {}, academicYear = {}, idFormats = {}, moduleDefaults = {}) {
  return {
    instituteConfigured: Boolean(institute.name && institute.email),
    academicYear: academicYear.name || 'Not Set',
    idFormats: Object.keys(idFormats).length,
    enabledDefaults: Object.values(moduleDefaults).filter(Boolean).length,
  };
}

export function validateInstituteSettings(form) {
  if (!form.name?.trim()) return 'Institute name is required.';
  if (!form.email?.trim()) return 'Institute email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid institute email is required.';
  if (!form.phone?.trim()) return 'Phone is required.';
  return '';
}

export function validateAcademicYearSettings(form) {
  if (!form.name?.trim()) return 'Academic year name is required.';
  if (!form.startsOn) return 'Start date is required.';
  if (!form.endsOn) return 'End date is required.';
  if (form.endsOn < form.startsOn) return 'End date cannot be before start date.';
  return '';
}

export function buildNextId(format = '', nextNumber = 1) {
  const year = String(new Date().getFullYear());
  return format.replace('{year}', year).replace('{number}', String(nextNumber).padStart(5, '0'));
}
