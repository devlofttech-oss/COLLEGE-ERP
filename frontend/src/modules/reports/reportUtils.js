export const backendReportDefinitions = {
  'students.list': {
    label: 'Student List',
    group: 'Students',
    description: 'Student roster with admission, class, roll number, and status fields.',
    filters: ['academicYear', 'classId', 'sectionId', 'status', 'gender'],
  },
  'students.classWise': {
    label: 'Students Class Wise',
    group: 'Students',
    description: 'Student count grouped by class.',
    filters: ['academicYear'],
  },
  'students.gender': {
    label: 'Students By Gender',
    group: 'Students',
    description: 'Student count grouped by gender.',
    filters: ['academicYear', 'classId'],
  },
  'students.status': {
    label: 'Students By Status',
    group: 'Students',
    description: 'Student count grouped by status.',
    filters: ['academicYear'],
  },
  'admissions.status': {
    label: 'Admissions By Status',
    group: 'Admissions',
    description: 'Admission count grouped by status.',
    filters: ['academicYear'],
  },
  'admissions.source': {
    label: 'Admissions By Source',
    group: 'Admissions',
    description: 'Admission count grouped by source.',
    filters: ['academicYear'],
  },
  'fees.collection': {
    label: 'Fee Collection',
    group: 'Fees',
    description: 'Fee payment rows and collection summary.',
    filters: ['studentId'],
  },
  'fees.pending': {
    label: 'Pending Fees',
    group: 'Fees',
    description: 'Pending and partial fee assignments.',
    filters: ['classId', 'academicYear'],
  },
  'fees.mode': {
    label: 'Fees By Mode',
    group: 'Fees',
    description: 'Fee payment count grouped by payment mode.',
    filters: [],
  },
  'staff.list': {
    label: 'Staff List',
    group: 'Staff',
    description: 'Staff roster with employee, department, designation, and status fields.',
    filters: ['type', 'departmentId', 'status'],
  },
  'staff.department': {
    label: 'Staff By Department',
    group: 'Staff',
    description: 'Staff count grouped by department.',
    filters: [],
  },
};

export const reportFilterFields = {
  academicYear: { label: 'Academic Year', placeholder: '2025-2026' },
  classId: { label: 'Class ID', placeholder: 'class id' },
  sectionId: { label: 'Section ID', placeholder: 'section id' },
  status: { label: 'Status', placeholder: 'status' },
  gender: { label: 'Gender', placeholder: 'gender' },
  studentId: { label: 'Student ID', placeholder: 'student id' },
  type: { label: 'Staff Type', placeholder: 'teaching' },
  departmentId: { label: 'Department ID', placeholder: 'department id' },
};

export function labelize(value = '') {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function getReportDefinition(name = '') {
  return backendReportDefinitions[name] || {
    label: labelize(name),
    group: 'Reports',
    description: 'Report definition.',
    filters: [],
  };
}

export function buildReportList(names = []) {
  return names.map((name) => ({
    name,
    ...getReportDefinition(name),
  }));
}

export function buildReportQuery(filters = {}, definition = {}) {
  return (definition.filters || []).reduce((query, field) => {
    const value = filters[field];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      query[field] = String(value).trim();
    }
    return query;
  }, {});
}

export function normalizeReportResult(result = {}) {
  return {
    name: result.name || '',
    columns: Array.isArray(result.columns) ? result.columns : [],
    rows: Array.isArray(result.rows) ? result.rows : [],
    summary: result.summary && typeof result.summary === 'object' ? result.summary : {},
  };
}

export function summarizeReportResult(result = {}) {
  const normalized = normalizeReportResult(result);
  return {
    columns: normalized.columns.length,
    rows: normalized.rows.length,
    summaryFields: Object.keys(normalized.summary).length,
  };
}

export function formatReportValue(column = '', value) {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'object') {
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(Number(seconds))) return formatReportDate(new Date(Number(seconds) * 1000));
    return JSON.stringify(value);
  }
  if (/amount|balance|paid|total|due/i.test(column) && Number.isFinite(Number(value))) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }
  if (/date|createdAt|paidAt/i.test(column)) return formatReportDate(value);
  return String(value);
}

export function formatReportDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
