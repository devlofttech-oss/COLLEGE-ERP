export function formatDisplayDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export function calculateResultStatus(percentage) {
  return percentage >= 40 ? 'Pass' : 'Needs Improvement';
}

export function calculatePercentage(marksObtained, maxMarks) {
  const obtained = Number(marksObtained);
  const maximum = Number(maxMarks);
  if (!maximum || Number.isNaN(obtained) || Number.isNaN(maximum)) return 0;
  return Math.round((obtained / maximum) * 100);
}

export function summarizeStudentMarks(marks) {
  const totalObtained = marks.reduce((sum, item) => sum + Number(item.marksObtained || 0), 0);
  const totalMax = marks.reduce((sum, item) => sum + Number(item.maxMarks || 0), 0);
  const percentage = calculatePercentage(totalObtained, totalMax);
  return {
    totalObtained,
    totalMax,
    percentage,
    grade: calculateGrade(percentage),
    status: calculateResultStatus(percentage),
  };
}

export function validateExamSchedule(form) {
  const required = [
    ['examName', 'Exam name'],
    ['classKey', 'Class'],
    ['subject', 'Subject'],
    ['examDate', 'Exam date'],
    ['maxMarks', 'Max marks'],
  ];
  const missing = required.find(([key]) => !String(form[key] || '').trim());
  if (missing) return `${missing[1]} is required.`;
  if (Number(form.maxMarks) <= 0) return 'Max marks must be greater than zero.';
  return '';
}

export function validateMarksEntry(form) {
  if (!form.studentRecordId) return 'Student is required.';
  if (!form.examScheduleId) return 'Exam schedule is required.';
  if (form.marksObtained === '' || form.marksObtained === null) return 'Marks obtained is required.';
  if (Number(form.marksObtained) < 0) return 'Marks cannot be negative.';
  if (Number(form.marksObtained) > Number(form.maxMarks)) return 'Marks cannot exceed max marks.';
  return '';
}

export function validateBackendExam(form) {
  if (!form.name?.trim()) return 'Exam name is required.';
  if (!form.examType) return 'Exam type is required.';
  if (!form.startDate) return 'Start date is required.';
  if (!form.endDate) return 'End date is required.';
  return '';
}

export function validateBackendSchedule(form) {
  if (!form.examId) return 'Exam is required.';
  if (!form.classId) return 'Class is required.';
  if (!form.subjectId) return 'Subject is required.';
  if (form.maxMarks === undefined || form.maxMarks === '' || Number(form.maxMarks) <= 0) {
    return 'Max marks must be greater than zero.';
  }
  if (form.passingMarks !== undefined && form.passingMarks !== '' && Number(form.passingMarks) < 0) {
    return 'Passing marks cannot be negative.';
  }
  if (
    form.passingMarks !== undefined &&
    form.passingMarks !== '' &&
    Number(form.passingMarks) > Number(form.maxMarks)
  ) {
    return 'Passing marks cannot exceed max marks.';
  }
  return '';
}

export function validateBackendMarks(payload) {
  if (!payload.examId) return 'Exam is required.';
  if (!payload.classId) return 'Class is required.';
  if (!payload.subjectId) return 'Subject is required.';
  if (!Array.isArray(payload.entries) || !payload.entries.length) return 'At least one marks entry is required.';

  const maxMarks = payload.maxMarks === undefined || payload.maxMarks === null || payload.maxMarks === ''
    ? null
    : Number(payload.maxMarks);
  if (maxMarks !== null && maxMarks <= 0) return 'Max marks must be greater than zero.';

  const invalidEntry = payload.entries.find((entry) => {
    if (!entry.studentId) return true;
    if (entry.absent) return false;
    if (entry.marksObtained === null || entry.marksObtained === undefined || entry.marksObtained === '') return true;
    if (Number(entry.marksObtained) < 0) return true;
    if (maxMarks !== null && Number(entry.marksObtained) > maxMarks) return true;
    return false;
  });

  if (!invalidEntry) return '';
  if (!invalidEntry.studentId) return 'Each entry needs a student.';
  if (invalidEntry.marksObtained === null || invalidEntry.marksObtained === undefined || invalidEntry.marksObtained === '') {
    return 'Marks obtained is required unless the student is absent.';
  }
  if (Number(invalidEntry.marksObtained) < 0) return 'Marks cannot be negative.';
  return 'Marks cannot exceed max marks.';
}
