import assert from 'node:assert/strict';
import { buildAdmissionStages } from '../src/modules/dashboard/dashboardUtils.js';

const students = [
  { id: 's1', studentId: 'STU-1', status: 'Active' },
  { id: 's2', studentId: 'STU-2', status: 'Active' },
  { id: 's3', studentId: 'STU-3', status: 'Archived' },
];

const admissions = [
  { id: 'a1', studentId: 'STU-1', status: 'Approved' },
  { id: 'a2', studentId: 'STU-2', status: 'Pending Review' },
];

assert.deepEqual(buildAdmissionStages(students, admissions).map((stage) => [stage.label, stage.value]), [
  ['Applications', 2],
  ['In Review', 1],
  ['Admitted', 2],
  ['Archived', 1],
]);

assert.equal(buildAdmissionStages(students, [])[0].value, 3);

console.log('Dashboard tests passed.');
