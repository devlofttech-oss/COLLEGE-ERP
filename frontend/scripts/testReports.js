import assert from 'node:assert/strict';
import {
  buildReportList,
  buildReportQuery,
  formatReportValue,
  getReportDefinition,
  normalizeReportResult,
  summarizeReportResult,
} from '../src/modules/reports/reportUtils.js';

const names = ['students.list', 'fees.pending', 'staff.department'];
const reportList = buildReportList(names);

assert.deepEqual(reportList.map((report) => report.name), names);
assert.equal(reportList[0].label, 'Student List');
assert.equal(reportList[1].group, 'Fees');
assert.deepEqual(getReportDefinition('students.list').filters, ['academicYear', 'classId', 'sectionId', 'status', 'gender']);
assert.deepEqual(getReportDefinition('fees.mode').filters, []);
assert.equal(getReportDefinition('unknown.report').label, 'Unknown Report');

assert.deepEqual(
  buildReportQuery({
    academicYear: ' 2025-2026 ',
    classId: '',
    status: 'active',
    unsupported: 'ignore',
  }, getReportDefinition('students.list')),
  { academicYear: '2025-2026', status: 'active' }
);

const result = normalizeReportResult({
  name: 'fees.collection',
  columns: ['receiptNumber', 'amount'],
  rows: [{ receiptNumber: 'RCPT-1', amount: 1200 }],
  summary: { total: 1200, count: 1 },
});

assert.deepEqual(summarizeReportResult(result), { columns: 2, rows: 1, summaryFields: 2 });
assert.equal(formatReportValue('amount', 1200), '₹1,200');
assert.equal(formatReportValue('createdAt', '2026-01-15T09:00:00.000Z'), '15 Jan 2026');
assert.equal(formatReportValue('missing', ''), '-');

console.log('Reports tests passed.');
