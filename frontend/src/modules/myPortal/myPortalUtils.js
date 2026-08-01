export const studentPortalPermissions = [
  'students.viewOwn',
  'attendance.viewOwn',
  'fees.viewOwn',
  'timetable.viewOwn',
  'examinations.viewOwn',
  'results.viewOwn',
];

export const teacherPortalPermissions = [
  'attendance.mark',
  'timetable.view',
  'examinations.marks',
];

export const myPortalPermissions = [
  ...studentPortalPermissions,
  'communication.view',
  ...teacherPortalPermissions,
];

function asNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function getPortalStudentId(student = {}) {
  return student.id || student.studentId || student.uid || '';
}

export function getPortalStudentName(student = {}) {
  return student.name || student.studentName || [student.firstName, student.lastName].filter(Boolean).join(' ') || '-';
}

export function getPortalStudentClass(student = {}) {
  return [student.className || student.class || student.classId, student.sectionName || student.section || student.sectionId]
    .filter(Boolean)
    .join(' - ') || '-';
}

export function getLinkedStudentIds(user = {}) {
  return user.profile?.linkedStudentIds || user.linkedStudentIds || user.linkedStudentRecordIds || [];
}

export function parsePortalDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate();
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(Number(seconds))) return new Date(Number(seconds) * 1000);
  }
  const parsed = new Date(typeof value === 'string' && !value.includes('T') ? `${value}T00:00:00` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPortalDate(value) {
  const date = parsePortalDate(value);
  if (!date) return value || '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatPortalCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(asNumber(value));
}

export function labelizePortalValue(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function summarizePortalAttendance(payload = {}) {
  const records = Array.isArray(payload.records) ? payload.records : [];
  const counted = records.reduce((summary, record) => {
    const status = String(record.status || '').toLowerCase();
    if (status.includes('present')) summary.present += 1;
    else if (status.includes('late')) {
      summary.late += 1;
      summary.present += 1;
    } else if (status.includes('absent')) summary.absent += 1;
    else if (status.includes('leave')) summary.leave += 1;
    return summary;
  }, { present: 0, absent: 0, late: 0, leave: 0 });
  const percentageData = payload.percentage || {};
  const total = asNumber(percentageData.total) || records.length;
  const percentage = percentageData.percentage !== undefined
    ? asNumber(percentageData.percentage)
    : total
      ? Math.round((counted.present / total) * 100)
      : 0;
  return {
    ...counted,
    total,
    percentage,
    records,
  };
}

export function summarizePortalFees(payload = {}) {
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const pending = Array.isArray(payload.pending) ? payload.pending : [];
  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  const totalDue = payload.totalDue !== undefined
    ? asNumber(payload.totalDue)
    : pending.reduce((sum, item) => sum + asNumber(item.balance || item.dueAmount || item.amountDue), 0);
  const totalAssigned = assignments.reduce((sum, item) => sum + asNumber(item.totalAmount || item.amount || item.feeAmount), 0);
  const totalPaid = payments.reduce((sum, item) => sum + asNumber(item.amount || item.paidAmount), 0);
  return {
    assignments,
    pending,
    payments,
    totalAssigned,
    totalDue,
    totalPaid,
  };
}

export function flattenPortalTimetable(timetable = {}) {
  return Object.entries(timetable || {})
    .filter(([, entries]) => Array.isArray(entries) && entries.length)
    .map(([day, entries]) => ({ day, entries }));
}

export function summarizePortalDownloads(payload = {}) {
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  const receipts = Array.isArray(payload.receipts) ? payload.receipts : [];
  return {
    documents,
    receipts,
    total: documents.length + receipts.length,
  };
}

export function summarizePortalClasses(payload = {}) {
  const allocations = Array.isArray(payload.allocations) ? payload.allocations : [];
  const classIds = new Set(allocations.map((item) => item.classId).filter(Boolean));
  const subjectIds = new Set(allocations.map((item) => item.subjectId).filter(Boolean));
  return {
    staffId: payload.staffId || '',
    staffName: payload.staffName || '-',
    allocations,
    classes: classIds.size,
    subjects: subjectIds.size,
  };
}

export function isReceiptDownload(item = {}) {
  return Boolean(item.url && item.receiptNumber);
}
