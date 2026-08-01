import assert from 'node:assert/strict';
import {
  activityActionLabel,
  activityMetaPreview,
  buildAdmissionStages,
  buildDashboardMetrics,
  buildFeeBreakdown,
  formatDashboardDate,
  normalizeDashboardOverview,
  summarizeDashboardOverview,
} from '../src/modules/dashboard/dashboardUtils.js';

const overview = {
  students: { total: '12', active: 10, inactive: 2 },
  staff: { total: 5, teaching: 4 },
  fees: { collectedToday: 1500, collectedMonth: 12000, pendingDues: 4000 },
  admissions: { newEnquiries: 3, followUps: 2, pendingApplications: 1, approved: 4 },
  exams: { upcoming: [{ id: 'exam-1', name: 'Mid Term', startDate: '2026-01-15' }] },
  results: { publishedCount: 8 },
  notices: { latest: [{ id: 'notice-1', title: 'Holiday', createdAt: '2026-01-14T09:00:00.000Z' }] },
  generatedAt: '2026-01-14T10:00:00.000Z',
};

const normalized = normalizeDashboardOverview(overview);
assert.equal(normalized.students.total, 12);
assert.equal(normalized.staff.teaching, 4);
assert.equal(normalized.fees.pendingDues, 4000);
assert.equal(normalized.exams.upcoming.length, 1);
assert.equal(normalized.notices.latest.length, 1);

assert.deepEqual(buildDashboardMetrics(overview).map((metric) => [metric.id, metric.value]), [
  ['students', 12],
  ['staff', 5],
  ['fees-today', 1500],
  ['fees-month', 12000],
  ['dues', 4000],
  ['results', 8],
]);

assert.deepEqual(buildAdmissionStages(overview.admissions).map((stage) => [stage.id, stage.value]), [
  ['new', 3],
  ['follow-up', 2],
  ['applications', 1],
  ['approved', 4],
]);

assert.deepEqual(buildFeeBreakdown(overview.fees).map((entry) => [entry.id, entry.value]), [
  ['today', 1500],
  ['month', 12000],
  ['dues', 4000],
]);

assert.deepEqual(summarizeDashboardOverview(overview), {
  studentRecords: 12,
  staffRecords: 5,
  admissionWork: 6,
  upcomingExams: 1,
  latestNotices: 1,
  publishedResults: 8,
});

assert.equal(formatDashboardDate('2026-01-15'), '15 Jan 2026');
assert.equal(activityActionLabel('fees.collect'), 'Fees Collect');
assert.equal(activityMetaPreview({ count: 2, amount: 500, channel: 'app', skipped: true }), 'Count: 2 | Amount: 500 | Channel: app');

console.log('Dashboard tests passed.');
