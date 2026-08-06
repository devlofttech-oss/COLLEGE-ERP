export const DEFAULT_GRADE_BANDS = [
  { grade: 'A+', min: 90 },
  { grade: 'A', min: 80 },
  { grade: 'B+', min: 70 },
  { grade: 'B', min: 60 },
  { grade: 'C', min: 50 },
  { grade: 'D', min: 40 },
  { grade: 'F', min: 0 },
];

export function normalizeGradeBands(bands = []) {
  const source = Array.isArray(bands) && bands.length ? bands : DEFAULT_GRADE_BANDS;
  return source
    .map((band) => ({ grade: String(band.grade || '').trim(), min: Number(band.min) }))
    .filter((band) => band.grade && !Number.isNaN(band.min))
    .sort((first, second) => second.min - first.min);
}

export function validateGradeSettings(form = {}) {
  if (!form.academicYear?.trim()) return 'Academic year is required.';
  const passMark = Number(form.passMark);
  if (Number.isNaN(passMark) || passMark < 0 || passMark > 100) return 'Pass mark must be between 0 and 100.';
  const bands = normalizeGradeBands(form.bands);
  if (!bands.length) return 'At least one grade band is required.';
  const invalid = bands.find((band) => !band.grade || band.min < 0 || band.min > 100);
  if (invalid) return 'Each grade band needs a grade and a minimum between 0 and 100.';
  const duplicate = bands.find((band, index) => bands.findIndex((item) => item.grade === band.grade) !== index);
  if (duplicate) return 'Grade labels must be unique.';
  return '';
}

export function validateResultSelection(form = {}) {
  if (!form.examId) return 'Exam is required.';
  if (!form.classId) return 'Class is required.';
  return '';
}

export function formatPercentage(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return '-';
  return `${number.toFixed(Number.isInteger(number) ? 0 : 2)}%`;
}

export function resultStatusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'fail') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}
