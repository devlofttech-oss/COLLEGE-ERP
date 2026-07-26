export function formatDisplayDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function buildClassKey(batch) {
  return [batch.className, batch.section].filter(Boolean).join(' - ');
}

export function summarizeAcademics(programs = [], subjects = [], batches = [], events = []) {
  return {
    programs: programs.length,
    subjects: subjects.length,
    batches: batches.length,
    publishedEvents: events.filter((item) => item.status === 'Published').length,
  };
}

export function filterAcademicItems(items = [], search = '') {
  const term = search.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) =>
    [item.name, item.code, item.className, item.section, item.subjectName, item.title, item.programName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  );
}

export function validateProgram(form) {
  if (!form.name?.trim()) return 'Program name is required.';
  if (!form.code?.trim()) return 'Program code is required.';
  if (!form.academicYear?.trim()) return 'Academic year is required.';
  return '';
}

export function validateSubject(form) {
  if (!form.subjectName?.trim()) return 'Subject name is required.';
  if (!form.subjectCode?.trim()) return 'Subject code is required.';
  if (!form.programName?.trim()) return 'Program is required.';
  return '';
}

export function validateBatch(form) {
  if (!form.className?.trim()) return 'Class name is required.';
  if (!form.section?.trim()) return 'Section is required.';
  if (!form.programName?.trim()) return 'Program is required.';
  return '';
}

export function validateCalendarEvent(form) {
  if (!form.title?.trim()) return 'Event title is required.';
  if (!form.eventDate) return 'Event date is required.';
  if (!form.eventType?.trim()) return 'Event type is required.';
  return '';
}
