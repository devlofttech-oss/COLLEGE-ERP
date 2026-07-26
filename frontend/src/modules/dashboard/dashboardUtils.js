export function buildAdmissionStages(students = [], admissions = []) {
  const activeStudents = students.filter((student) => student.status !== 'Archived');
  const reviewStatuses = /review|pending|submitted|draft/i;
  const admittedStatuses = /active|approved|admitted/i;
  const applicationSource = admissions.length ? admissions : students;
  const applicationCount = applicationSource.length;
  const reviewCount = applicationSource.filter((item) => reviewStatuses.test(item.status || '')).length;
  const admittedCount = activeStudents.filter((student) => admittedStatuses.test(student.status || '')).length;
  const archivedCount = students.filter((student) => student.status === 'Archived').length;

  return [
    { label: 'Applications', value: applicationCount, color: '#2563eb' },
    { label: 'In Review', value: reviewCount, color: '#f59e0b' },
    { label: 'Admitted', value: admittedCount, color: '#22c55e' },
    { label: 'Archived', value: archivedCount, color: '#8b5cf6' },
  ];
}
