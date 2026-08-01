export const emptyDashboardOverview = {
  students: { total: 0, active: 0, inactive: 0 },
  staff: { total: 0, teaching: 0 },
  fees: { collectedToday: 0, collectedMonth: 0, pendingDues: 0 },
  admissions: { newEnquiries: 0, followUps: 0, pendingApplications: 0, approved: 0 },
  exams: { upcoming: [] },
  results: { publishedCount: 0 },
  notices: { latest: [] },
  generatedAt: '',
};

function asNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function parseDashboardDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate();
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(Number(seconds))) return new Date(Number(seconds) * 1000);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDashboardDate(value) {
  const date = parseDashboardDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDashboardDateTime(value) {
  const date = parseDashboardDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDashboardCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

export function labelize(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function normalizeDashboardOverview(overview = {}) {
  return {
    students: {
      total: asNumber(overview.students?.total),
      active: asNumber(overview.students?.active),
      inactive: asNumber(overview.students?.inactive),
    },
    staff: {
      total: asNumber(overview.staff?.total),
      teaching: asNumber(overview.staff?.teaching),
    },
    fees: {
      collectedToday: asNumber(overview.fees?.collectedToday),
      collectedMonth: asNumber(overview.fees?.collectedMonth),
      pendingDues: asNumber(overview.fees?.pendingDues),
    },
    admissions: {
      newEnquiries: asNumber(overview.admissions?.newEnquiries),
      followUps: asNumber(overview.admissions?.followUps),
      pendingApplications: asNumber(overview.admissions?.pendingApplications),
      approved: asNumber(overview.admissions?.approved),
    },
    exams: {
      upcoming: Array.isArray(overview.exams?.upcoming) ? overview.exams.upcoming : [],
    },
    results: {
      publishedCount: asNumber(overview.results?.publishedCount),
    },
    notices: {
      latest: Array.isArray(overview.notices?.latest) ? overview.notices.latest : [],
    },
    generatedAt: overview.generatedAt || '',
  };
}

export function buildDashboardMetrics(overview = emptyDashboardOverview) {
  const normalized = normalizeDashboardOverview(overview);
  return [
    { id: 'students', label: 'Students', value: normalized.students.total, helper: `${normalized.students.active} active` },
    { id: 'staff', label: 'Staff', value: normalized.staff.total, helper: `${normalized.staff.teaching} teaching` },
    { id: 'fees-today', label: 'Fees Today', value: normalized.fees.collectedToday, helper: 'Collected today', currency: true },
    { id: 'fees-month', label: 'Fees Month', value: normalized.fees.collectedMonth, helper: 'Collected this month', currency: true },
    { id: 'dues', label: 'Pending Dues', value: normalized.fees.pendingDues, helper: 'Outstanding balance', currency: true },
    { id: 'results', label: 'Published Results', value: normalized.results.publishedCount, helper: 'Published records' },
  ];
}

export function buildAdmissionStages(admissions = {}) {
  const normalized = normalizeDashboardOverview({ admissions }).admissions;
  return [
    { id: 'new', label: 'New Enquiries', value: normalized.newEnquiries, color: '#2563eb' },
    { id: 'follow-up', label: 'Follow-ups', value: normalized.followUps, color: '#f59e0b' },
    { id: 'applications', label: 'Pending Applications', value: normalized.pendingApplications, color: '#8b5cf6' },
    { id: 'approved', label: 'Approved', value: normalized.approved, color: '#22c55e' },
  ];
}

export function buildFeeBreakdown(fees = {}) {
  const normalized = normalizeDashboardOverview({ fees }).fees;
  return [
    { id: 'today', label: 'Today', value: normalized.collectedToday, color: '#22c55e' },
    { id: 'month', label: 'This Month', value: normalized.collectedMonth, color: '#006a62' },
    { id: 'dues', label: 'Pending Dues', value: normalized.pendingDues, color: '#f59e0b' },
  ];
}

export function summarizeDashboardOverview(overview = {}) {
  const normalized = normalizeDashboardOverview(overview);
  return {
    studentRecords: normalized.students.total,
    staffRecords: normalized.staff.total,
    admissionWork: normalized.admissions.newEnquiries + normalized.admissions.followUps + normalized.admissions.pendingApplications,
    upcomingExams: normalized.exams.upcoming.length,
    latestNotices: normalized.notices.latest.length,
    publishedResults: normalized.results.publishedCount,
  };
}

export function activityActionLabel(action = '') {
  return labelize(action);
}

export function activityMetaPreview(meta = null) {
  if (!meta || typeof meta !== 'object') return '';
  return Object.entries(meta)
    .slice(0, 3)
    .map(([key, value]) => `${labelize(key)}: ${String(value)}`)
    .join(' | ');
}
