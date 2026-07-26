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
