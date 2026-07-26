// Reports (Spec §11): filtered operational reports across modules, returnable as
// JSON or CSV. Each report is a named generator; the route exposes them uniformly
// with query-param filters.

import { repo } from '../../utils/firestore.js';
import { ApiError } from '../../utils/ApiError.js';

const students = repo('students');
const admissions = repo('admissions');
const feePayments = repo('feePayments');
const feeAssignments = repo('feeAssignments');
const staff = repo('staffMembers');

function groupCount(list, key) {
  const out = {};
  for (const r of list) {
    const k = r[key] ?? 'Unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return Object.entries(out).map(([value, count]) => ({ value, count }));
}

function whereFromQuery(query, fields) {
  return fields.filter((f) => query[f] !== undefined).map((f) => [f, '==', query[f]]);
}

// Registry: name -> async (query) => { columns, rows } (rows are plain objects).
export const REPORTS = {
  // ── Students ──
  'students.list': async (q) => {
    const rows = await students.list({ where: whereFromQuery(q, ['academicYear', 'classId', 'sectionId', 'status', 'gender']), orderBy: { field: 'nameLower' } });
    return { columns: ['admissionNumber', 'name', 'gender', 'className', 'section', 'rollNumber', 'status'], rows };
  },
  'students.classWise': async (q) => {
    const rows = await students.list({ where: whereFromQuery(q, ['academicYear']) });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'className') };
  },
  'students.gender': async (q) => {
    const rows = await students.list({ where: whereFromQuery(q, ['academicYear', 'classId']) });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'gender') };
  },
  'students.status': async (q) => {
    const rows = await students.list({ where: whereFromQuery(q, ['academicYear']), includeArchived: true });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'status') };
  },

  // ── Admissions ──
  'admissions.status': async (q) => {
    const rows = await admissions.list({ where: whereFromQuery(q, ['academicYear']), includeArchived: true });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'status') };
  },
  'admissions.source': async (q) => {
    const rows = await admissions.list({ where: whereFromQuery(q, ['academicYear']), includeArchived: true });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'source') };
  },

  // ── Fees ──
  'fees.collection': async (q) => {
    const rows = await feePayments.list({ where: whereFromQuery(q, ['studentId']), includeArchived: true, orderBy: { field: 'createdAt', direction: 'desc' } });
    const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
    return { columns: ['receiptNumber', 'studentName', 'amount', 'paymentMode', 'referenceNumber'], rows, summary: { total, count: rows.length } };
  },
  'fees.pending': async (q) => {
    const rows = await feeAssignments.list({ where: [...whereFromQuery(q, ['classId', 'academicYear']), ['status', 'in', ['pending', 'partial']]] });
    const totalDue = rows.reduce((s, r) => s + (r.balance || 0), 0);
    return { columns: ['studentName', 'feeHeadName', 'amount', 'paidAmount', 'balance', 'status'], rows, summary: { totalDue, count: rows.length } };
  },
  'fees.mode': async () => {
    const rows = await feePayments.list({ includeArchived: true });
    return { columns: ['value', 'count'], rows: groupCount(rows, 'paymentMode') };
  },

  // ── Staff ──
  'staff.list': async (q) => {
    const rows = await staff.list({ where: whereFromQuery(q, ['type', 'departmentId', 'status']), orderBy: { field: 'nameLower' } });
    return { columns: ['employeeId', 'name', 'type', 'department', 'designation', 'status'], rows };
  },
  'staff.department': async () => {
    const rows = await staff.list({});
    return { columns: ['value', 'count'], rows: groupCount(rows, 'department') };
  },
};

export function listReportNames() {
  return Object.keys(REPORTS);
}

export async function runReport(name, query = {}) {
  const gen = REPORTS[name];
  if (!gen) throw ApiError.notFound(`Unknown report: ${name}. Available: ${listReportNames().join(', ')}`);
  return gen(query);
}

function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv({ columns, rows }) {
  const header = columns.join(',');
  const lines = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(','));
  return [header, ...lines].join('\n');
}
