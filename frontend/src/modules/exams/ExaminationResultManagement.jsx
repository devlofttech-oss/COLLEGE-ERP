import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Loader2,
  Lock,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Unlock,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import {
  archiveExam,
  archiveExamSchedule,
  createExam,
  createExamSchedule,
  enterMarks,
  listExamSchedules,
  listExams,
  listMarks,
  unlockMarks,
  updateExam,
  updateExamSchedule,
  verifyMarks,
} from '../../api/examinations';
import { listStudents } from '../../api/students';
import { validateBackendExam, validateBackendMarks, validateBackendSchedule } from './examUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const EXAM_TYPES = ['Internal', 'Final', 'Unit Test', 'Mid Term', 'Practical', 'Other'];
const STATUS_OPTIONS = ['active', 'inactive', 'completed'];
const TABS = [
  { id: 'exams', label: 'Exams', icon: BookOpenCheck },
  { id: 'schedules', label: 'Schedules', icon: CalendarDays },
  { id: 'marks', label: 'Marks', icon: ClipboardList },
];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function compactPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function activeItems(items = []) {
  return items.filter((item) => !item.archived && String(item.status || 'active').toLowerCase() !== 'inactive');
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') {
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  }
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleDateString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
  return String(value);
}

function statusClasses(value) {
  const normalized = String(value || 'active').toLowerCase();
  if (normalized === 'completed' || normalized === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'inactive' || normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (normalized === 'locked') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function routeTab(initialTask = '', initialBranch = '') {
  const requested = [initialTask, initialBranch].find((item) => TABS.some((tab) => tab.id === item));
  if (requested) return requested;
  if (['create-schedule', 'review-schedules', 'schedule-exams'].includes(initialBranch || initialTask)) return 'schedules';
  if (['enter-marks', 'review-marks', 'verify-marks'].includes(initialBranch || initialTask)) return 'marks';
  return 'exams';
}

function classLabel(klass = {}) {
  return [klass.name, klass.courseName].filter(Boolean).join(' - ') || klass.id;
}

function subjectLabel(subject = {}) {
  return [subject.name, subject.code].filter(Boolean).join(' - ') || subject.id;
}

function examLabel(exam = {}) {
  return [exam.name, exam.examType].filter(Boolean).join(' - ') || exam.id;
}

function scheduleLabel(schedule = {}) {
  return [
    schedule.examName,
    schedule.className,
    schedule.subjectName,
    formatDate(schedule.examDate),
  ].filter((item) => item && item !== '-').join(' | ') || schedule.id;
}

function comboKey(record = {}) {
  return [record.examId || '', record.classId || '', record.subjectId || ''].join('|');
}

async function optionalLoad(loader, fallback) {
  try {
    return await loader();
  } catch (error) {
    console.warn('Optional examination support data did not load.', error);
    return fallback;
  }
}

function ModalFrame({ children, footer, maxWidth = 'max-w-3xl', onClose, subtitle, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4">
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,.15)]', maxWidth)}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-500">Examinations</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Close">
            <X size={17} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, loading, value }) {
  return (
    <div className="tt-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{loading ? '-' : value}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function ExamModal({ academicYear, initialRecord, onClose, onSave, saving }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    name: initialRecord?.name || '',
    examType: initialRecord?.examType || EXAM_TYPES[0],
    startDate: initialRecord?.startDate || '',
    endDate: initialRecord?.endDate || '',
    academicYear: initialRecord?.academicYear || academicYear || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = compactPayload({
      name: form.name.trim(),
      examType: form.examType,
      startDate: form.startDate,
      endDate: form.endDate,
      academicYear: form.academicYear.trim() || undefined,
      status: form.status || undefined,
    });
    const validationMessage = validateBackendExam(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Exam' : 'Create Exam'}
        subtitle={isEdit ? initialRecord.name : 'Name, type, dates, year, and status.'}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Name *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} autoFocus />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Exam Type *</span>
            <select value={form.examType} onChange={(event) => update('examType', event.target.value)} className={inputClass}>
              {EXAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Academic Year</span>
            <input value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Start Date *</span>
            <input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">End Date *</span>
            <input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function ScheduleModal({ academicYear, classes, exams, initialRecord, onClose, onSave, saving, subjects }) {
  const isEdit = Boolean(initialRecord?.id);
  const initialClassId = initialRecord?.classId || classes[0]?.id || '';
  const initialSubjectOptions = subjects.filter((subject) => !initialClassId || subject.classId === initialClassId || !subject.classId);
  const [form, setForm] = useState(() => ({
    examId: initialRecord?.examId || exams[0]?.id || '',
    classId: initialClassId,
    subjectId: initialRecord?.subjectId || initialSubjectOptions[0]?.id || '',
    examDate: initialRecord?.examDate || '',
    startTime: initialRecord?.startTime || '',
    maxMarks: initialRecord?.maxMarks ?? '',
    passingMarks: initialRecord?.passingMarks ?? '',
    room: initialRecord?.room || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const classSubjects = subjects.filter((subject) => !form.classId || subject.classId === form.classId || !subject.classId);
  const selectedExam = exams.find((exam) => exam.id === form.examId);
  const selectedClass = classes.find((klass) => klass.id === form.classId);
  const selectedSubject = subjects.find((subject) => subject.id === form.subjectId);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateClass = (classId) => {
    const nextSubjects = subjects.filter((subject) => !classId || subject.classId === classId || !subject.classId);
    setForm((current) => ({
      ...current,
      classId,
      subjectId: nextSubjects.some((subject) => subject.id === current.subjectId) ? current.subjectId : nextSubjects[0]?.id || '',
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const basePayload = {
      examDate: form.examDate || undefined,
      startTime: form.startTime || undefined,
      maxMarks: form.maxMarks === '' ? undefined : Number(form.maxMarks),
      passingMarks: form.passingMarks === '' ? undefined : Number(form.passingMarks),
      room: form.room.trim() || undefined,
      status: form.status || undefined,
    };
    const payload = compactPayload(isEdit ? basePayload : {
      ...basePayload,
      examId: form.examId,
      classId: form.classId,
      className: selectedClass ? classLabel(selectedClass) : undefined,
      subjectId: form.subjectId,
      subjectName: selectedSubject ? subjectLabel(selectedSubject) : undefined,
    });
    const validationMessage = validateBackendSchedule({ ...payload, examId: form.examId, classId: form.classId, subjectId: form.subjectId });
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Schedule' : 'New Schedule'}
        subtitle={isEdit ? scheduleLabel(initialRecord) : academicYear || selectedExam?.academicYear || ''}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[64vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Exam *</span>
            <select value={form.examId} onChange={(event) => update('examId', event.target.value)} disabled={isEdit} className={inputClass}>
              <option value="">Select exam</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{examLabel(exam)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Class *</span>
            <select value={form.classId} onChange={(event) => updateClass(event.target.value)} disabled={isEdit} className={inputClass}>
              <option value="">Select class</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Subject *</span>
            <select value={form.subjectId} onChange={(event) => update('subjectId', event.target.value)} disabled={isEdit} className={inputClass}>
              <option value="">Select subject</option>
              {classSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Exam Date</span>
            <input type="date" value={form.examDate} onChange={(event) => update('examDate', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Start Time</span>
            <input type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Max Marks *</span>
            <input type="number" min="1" value={form.maxMarks} onChange={(event) => update('maxMarks', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Passing Marks</span>
            <input type="number" min="0" value={form.passingMarks} onChange={(event) => update('passingMarks', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Room</span>
            <input value={form.room} onChange={(event) => update('room', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function ExamsTable({ canCreate, exams, loading, onArchive, onEdit }) {
  return (
    <section className="tt-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Exam Records</h2>
        <span className="text-xs font-bold uppercase text-slate-500">{exams.length} listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Exam</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Academic Year</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading exams...</td></tr>}
            {!loading && exams.map((exam) => (
              <tr key={exam.id}>
                <td className="px-5 py-4 font-bold text-slate-900">{exam.name}</td>
                <td className="px-5 py-4 text-slate-500">{exam.examType}</td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(exam.academicYear)}</td>
                <td className="px-5 py-4 text-slate-500">{formatDate(exam.startDate)} - {formatDate(exam.endDate)}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(exam.status))}>{exam.status || 'active'}</span></td>
                <td className="px-5 py-4">
                  {canCreate && (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(exam)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Edit3 size={13} /> Edit</button>
                      <button type="button" onClick={() => onArchive(exam)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Archive size={13} /> Archive</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !exams.length && <tr><td colSpan="6" className="px-5 py-12"><EmptyState message="No exams found." /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SchedulesTable({ canCreate, loading, onArchive, onEdit, schedules }) {
  return (
    <section className="tt-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Exam Schedules</h2>
        <span className="text-xs font-bold uppercase text-slate-500">{schedules.length} listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Exam</th>
              <th className="px-5 py-3">Class</th>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">Date & Time</th>
              <th className="px-5 py-3">Marks</th>
              <th className="px-5 py-3">Room</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8" className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading schedules...</td></tr>}
            {!loading && schedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="px-5 py-4 font-bold text-slate-900">{valueOrDash(schedule.examName)}</td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(schedule.className)}</td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(schedule.subjectName)}</td>
                <td className="px-5 py-4 text-slate-500">{formatDate(schedule.examDate)} {schedule.startTime ? `at ${schedule.startTime}` : ''}</td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(schedule.maxMarks)} / {valueOrDash(schedule.passingMarks)}</td>
                <td className="px-5 py-4 text-slate-500">{valueOrDash(schedule.room)}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(schedule.status))}>{schedule.status || 'active'}</span></td>
                <td className="px-5 py-4">
                  {canCreate && (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(schedule)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Edit3 size={13} /> Edit</button>
                      <button type="button" onClick={() => onArchive(schedule)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Archive size={13} /> Archive</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !schedules.length && <tr><td colSpan="8" className="px-5 py-12"><EmptyState message="No schedules found." /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MarksPanel({
  canEnterMarks,
  canVerify,
  classes,
  currentMarks,
  drafts,
  exams,
  loading,
  maxMarks,
  onSave,
  onSelectSchedule,
  onSetMaxMarks,
  onUnlock,
  onUpdateDraft,
  onVerify,
  schedules,
  selectedClassId,
  selectedExamId,
  selectedScheduleId,
  selectedSubjectId,
  setSelectedClassId,
  setSelectedExamId,
  setSelectedSubjectId,
  students,
  subjects,
  saving,
}) {
  const classSubjects = subjects.filter((subject) => !selectedClassId || subject.classId === selectedClassId || !subject.classId);
  const hasCurrentSelection = Boolean(selectedExamId && selectedClassId && selectedSubjectId);
  const allLocked = currentMarks.length > 0 && currentMarks.every((mark) => mark.locked || mark.verified);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <section className="tt-card p-5">
        <h2 className="text-sm font-bold text-slate-900">Marks Selection</h2>
        <div className="mt-4 grid gap-4">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Schedule</span>
            <select value={selectedScheduleId} onChange={(event) => onSelectSchedule(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
              <option value="">Manual selection</option>
              {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{scheduleLabel(schedule)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Exam *</span>
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
              <option value="">Select exam</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{examLabel(exam)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Class *</span>
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
              <option value="">Select class</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Subject *</span>
            <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none">
              <option value="">Select subject</option>
              {classSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Max Marks</span>
            <input type="number" min="1" value={maxMarks} onChange={(event) => onSetMaxMarks(event.target.value)} className="w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onVerify} disabled={!canVerify || !hasCurrentSelection || !currentMarks.length || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white">
              <Lock size={14} /> Verify
            </button>
            <button type="button" onClick={onUnlock} disabled={!canVerify || !hasCurrentSelection || !currentMarks.length || saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700">
              <Unlock size={14} /> Unlock
            </button>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-500">
            <div className="flex items-center justify-between">
              <span className="font-bold">Entered</span>
              <span>{currentMarks.length}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold">Locked</span>
              <span>{allLocked ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tt-card overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Marks Entry</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">{students.length} students</p>
          </div>
          {canEnterMarks && (
            <button type="button" onClick={onSave} disabled={!hasCurrentSelection || !students.length || saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-bold text-white">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save Marks
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Marks</th>
                <th className="px-5 py-3">Absent</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan="4" className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading marks...</td></tr>}
              {!loading && students.map((student) => {
                const draft = drafts[student.id] || {};
                const disabled = !canEnterMarks || draft.locked || draft.verified;
                return (
                  <tr key={student.id}>
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.admissionNumber || student.rollNumber || student.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="number"
                        min="0"
                        max={maxMarks || undefined}
                        value={draft.marksObtained ?? ''}
                        onChange={(event) => onUpdateDraft(student.id, 'marksObtained', event.target.value)}
                        disabled={disabled || draft.absent}
                        className="h-10 w-28 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                        <input type="checkbox" checked={Boolean(draft.absent)} onChange={(event) => onUpdateDraft(student.id, 'absent', event.target.checked)} disabled={disabled} className="h-4 w-4 rounded border-slate-200 text-brand-500" />
                        Absent
                      </label>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(draft.verified || draft.locked ? 'locked' : 'active'))}>
                        {draft.verified || draft.locked ? 'Locked' : 'Editable'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && !students.length && <tr><td colSpan="4" className="px-5 py-12"><EmptyState message="No students found for this class." /></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function ExaminationResultManagement({
  academicYear = '',
  currentUser,
  initialBranch = '',
  initialTask = '',
  scopedStudents = [],
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [activeTab, setActiveTab] = useState(routeTab(initialTask, initialBranch));
  const [exams, setExams] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [marks, setMarks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [marksMaxMarks, setMarksMaxMarks] = useState('');
  const [markDraftOverrides, setMarkDraftOverrides] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');
  const [examModalRecord, setExamModalRecord] = useState(undefined);
  const [scheduleModalRecord, setScheduleModalRecord] = useState(undefined);

  const canView = hasPermission(currentUser, 'examinations.view') || hasPermission(currentUser, 'examinations.viewOwn');
  const canCreate = hasPermission(currentUser, 'examinations.create');
  const canEnterMarks = hasPermission(currentUser, 'examinations.marks');
  const canVerify = hasPermission(currentUser, 'examinations.verify');
  const effectiveAcademicYear = academicYear || selectedCourse?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || (selectedCourseCode !== 'all' ? selectedCourseCode : '');

  const loadExaminations = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextExams, nextSchedules, nextMarks] = await Promise.all([
        listExams({ academicYear: effectiveAcademicYear }),
        listExamSchedules(),
        listMarks(),
      ]);
      const classParams = { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' };
      const subjectParams = { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' };
      const [nextClasses, nextSubjects, nextStudents] = await Promise.all([
        optionalLoad(() => listAcademicResource('classes', classParams), []),
        optionalLoad(() => listAcademicResource('subjects', subjectParams), []),
        scopedStudents.length
          ? Promise.resolve({ students: scopedStudents, count: scopedStudents.length })
          : optionalLoad(() => listStudents({ academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' }), { students: [], count: 0 }),
      ]);
      setExams(nextExams);
      setSchedules(nextSchedules);
      setMarks(nextMarks);
      setClasses(activeItems(nextClasses));
      setSubjects(activeItems(nextSubjects));
      setStudents(activeItems(nextStudents.students || []));
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend examination data.', error);
      setLoadError(error?.message || 'Unable to load examinations from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, effectiveAcademicYear, effectiveCourseId, scopedStudents]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadExaminations();
    });
    return () => {
      active = false;
    };
  }, [loadExaminations]);

  const effectiveExamId = useMemo(() => (
    selectedExamId && exams.some((exam) => exam.id === selectedExamId) ? selectedExamId : exams[0]?.id || ''
  ), [exams, selectedExamId]);
  const effectiveClassId = useMemo(() => (
    selectedClassId && classes.some((klass) => klass.id === selectedClassId) ? selectedClassId : classes[0]?.id || ''
  ), [classes, selectedClassId]);
  const classSubjects = useMemo(() => subjects.filter((subject) => !effectiveClassId || subject.classId === effectiveClassId || !subject.classId), [effectiveClassId, subjects]);
  const effectiveSubjectId = useMemo(() => (
    selectedSubjectId && classSubjects.some((subject) => subject.id === selectedSubjectId) ? selectedSubjectId : classSubjects[0]?.id || ''
  ), [classSubjects, selectedSubjectId]);
  const selectedClass = useMemo(() => classes.find((klass) => klass.id === effectiveClassId) || null, [classes, effectiveClassId]);
  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === effectiveSubjectId) || null, [subjects, effectiveSubjectId]);
  const visibleClassIds = useMemo(() => new Set(classes.map((klass) => klass.id)), [classes]);

  const enrichedSchedules = useMemo(() => schedules.map((schedule) => {
    const exam = exams.find((item) => item.id === schedule.examId);
    const klass = classes.find((item) => item.id === schedule.classId);
    const subject = subjects.find((item) => item.id === schedule.subjectId);
    return {
      ...schedule,
      examName: schedule.examName || exam?.name || schedule.examId,
      className: schedule.className || (klass ? classLabel(klass) : schedule.classId),
      subjectName: schedule.subjectName || (subject ? subjectLabel(subject) : schedule.subjectId),
    };
  }), [classes, exams, schedules, subjects]);

  const visibleSchedules = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return enrichedSchedules
      .filter((schedule) => !effectiveCourseId || visibleClassIds.has(schedule.classId))
      .filter((schedule) => !needle || [
        schedule.examName,
        schedule.className,
        schedule.subjectName,
        schedule.room,
        schedule.status,
      ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [effectiveCourseId, enrichedSchedules, search, visibleClassIds]);

  const visibleExams = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exams.filter((exam) => !needle || [
      exam.name,
      exam.examType,
      exam.academicYear,
      exam.status,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [exams, search]);

  const matchingSchedule = useMemo(() => visibleSchedules.find((schedule) =>
    schedule.examId === effectiveExamId &&
    schedule.classId === effectiveClassId &&
    schedule.subjectId === effectiveSubjectId
  ) || null, [effectiveClassId, effectiveExamId, effectiveSubjectId, visibleSchedules]);

  const effectiveMarksMaxMarks = marksMaxMarks !== '' ? marksMaxMarks : matchingSchedule?.maxMarks ?? '';

  const currentMarks = useMemo(() => marks.filter((mark) =>
    mark.examId === effectiveExamId &&
    mark.classId === effectiveClassId &&
    mark.subjectId === effectiveSubjectId
  ), [effectiveClassId, effectiveExamId, effectiveSubjectId, marks]);

  const classStudents = useMemo(() => students.filter((student) => {
    if (!effectiveClassId) return true;
    return student.classId === effectiveClassId || (selectedClass?.name && student.className === selectedClass.name);
  }), [effectiveClassId, selectedClass, students]);

  const activeMarkSetKey = comboKey({ examId: effectiveExamId, classId: effectiveClassId, subjectId: effectiveSubjectId });
  const markDrafts = useMemo(() => {
    const marksByStudent = new Map(currentMarks.map((mark) => [mark.studentId, mark]));
    return Object.fromEntries(classStudents.map((student) => {
      const mark = marksByStudent.get(student.id) || {};
      const override = markDraftOverrides[`${activeMarkSetKey}|${student.id}`] || {};
      return [student.id, {
        marksObtained: mark.marksObtained ?? '',
        absent: Boolean(mark.absent),
        verified: Boolean(mark.verified),
        locked: Boolean(mark.locked),
        ...override,
      }];
    }));
  }, [activeMarkSetKey, classStudents, currentMarks, markDraftOverrides]);

  const verifiedGroups = useMemo(() => new Set(marks.filter((mark) => mark.verified).map(comboKey)).size, [marks]);
  const marksEntered = useMemo(() => marks.filter((mark) => mark.absent || mark.marksObtained !== null && mark.marksObtained !== undefined && mark.marksObtained !== '').length, [marks]);

  const updateDraft = (studentId, key, value) => {
    const draftKey = `${activeMarkSetKey}|${studentId}`;
    setMarkDraftOverrides((current) => ({
      ...current,
      [draftKey]: {
        ...(current[draftKey] || {}),
        [key]: value,
        ...(key === 'absent' && value ? { marksObtained: '' } : {}),
      },
    }));
  };

  const chooseExam = (examId) => {
    setSelectedExamId(examId);
    setSelectedScheduleId('');
    setMarksMaxMarks('');
  };

  const chooseClass = (classId) => {
    setSelectedClassId(classId);
    setSelectedSubjectId('');
    setSelectedScheduleId('');
    setMarksMaxMarks('');
  };

  const chooseSubject = (subjectId) => {
    setSelectedSubjectId(subjectId);
    setSelectedScheduleId('');
    setMarksMaxMarks('');
  };

  const selectSchedule = (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    const schedule = visibleSchedules.find((item) => item.id === scheduleId);
    if (!schedule) {
      setMarksMaxMarks('');
      return;
    }
    setSelectedExamId(schedule.examId || '');
    setSelectedClassId(schedule.classId || '');
    setSelectedSubjectId(schedule.subjectId || '');
    setMarksMaxMarks(schedule.maxMarks ?? '');
  };

  const saveExamRecord = async (payload) => {
    if (!canCreate) {
      toast.error('You do not have permission to create exams.');
      return;
    }
    const isEdit = Boolean(examModalRecord?.id);
    setSaving('exam');
    try {
      await (isEdit ? updateExam(examModalRecord.id, payload) : createExam(payload));
      setExamModalRecord(undefined);
      toast.success(isEdit ? 'Exam updated' : 'Exam created');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Exam was not saved.');
    } finally {
      setSaving('');
    }
  };

  const saveScheduleRecord = async (payload) => {
    if (!canCreate) {
      toast.error('You do not have permission to create schedules.');
      return;
    }
    const isEdit = Boolean(scheduleModalRecord?.id);
    setSaving('schedule');
    try {
      await (isEdit ? updateExamSchedule(scheduleModalRecord.id, payload) : createExamSchedule(payload));
      setScheduleModalRecord(undefined);
      toast.success(isEdit ? 'Schedule updated' : 'Schedule created');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Schedule was not saved.');
    } finally {
      setSaving('');
    }
  };

  const archiveExamRecord = async (exam) => {
    if (!canCreate) {
      toast.error('You do not have permission to archive exams.');
      return;
    }
    if (!window.confirm(`Archive ${exam.name}?`)) return;
    setSaving(`exam-${exam.id}`);
    try {
      await archiveExam(exam.id);
      toast.success('Exam archived');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Exam was not archived.');
    } finally {
      setSaving('');
    }
  };

  const archiveScheduleRecord = async (schedule) => {
    if (!canCreate) {
      toast.error('You do not have permission to archive schedules.');
      return;
    }
    if (!window.confirm(`Archive ${scheduleLabel(schedule)}?`)) return;
    setSaving(`schedule-${schedule.id}`);
    try {
      await archiveExamSchedule(schedule.id);
      toast.success('Schedule archived');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Schedule was not archived.');
    } finally {
      setSaving('');
    }
  };

  const saveMarks = async () => {
    if (!canEnterMarks) {
      toast.error('You do not have permission to enter marks.');
      return;
    }
    const payload = {
      examId: effectiveExamId,
      subjectId: effectiveSubjectId,
      subjectName: selectedSubject ? subjectLabel(selectedSubject) : undefined,
      classId: effectiveClassId,
      maxMarks: effectiveMarksMaxMarks === '' ? undefined : Number(effectiveMarksMaxMarks),
      entries: classStudents
        .map((student) => {
          const draft = markDrafts[student.id] || {};
          return {
            studentId: student.id,
            studentName: student.name || null,
            marksObtained: draft.absent || draft.marksObtained === '' ? null : Number(draft.marksObtained),
            absent: Boolean(draft.absent),
          };
        })
        .filter((entry) => entry.absent || entry.marksObtained !== null),
    };
    const validationMessage = validateBackendMarks(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setSaving('marks');
    try {
      await enterMarks(payload);
      toast.success('Marks saved');
      setMarkDraftOverrides((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${activeMarkSetKey}|`))));
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Marks were not saved.');
    } finally {
      setSaving('');
    }
  };

  const verifyCurrentMarks = async () => {
    if (!canVerify) {
      toast.error('You do not have permission to verify marks.');
      return;
    }
    setSaving('verify');
    try {
      await verifyMarks({ examId: effectiveExamId, subjectId: effectiveSubjectId, classId: effectiveClassId });
      toast.success('Marks verified');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Marks were not verified.');
    } finally {
      setSaving('');
    }
  };

  const unlockCurrentMarks = async () => {
    if (!canVerify) {
      toast.error('You do not have permission to unlock marks.');
      return;
    }
    setSaving('unlock');
    try {
      await unlockMarks({ examId: effectiveExamId, subjectId: effectiveSubjectId, classId: effectiveClassId });
      toast.success('Marks unlocked');
      await loadExaminations();
    } catch (error) {
      toast.error(error?.message || 'Marks were not unlocked.');
    } finally {
      setSaving('');
    }
  };

  if (!canView) {
    return (
      <div className="min-w-0">
        <EmptyState message="You do not have permission to view examinations." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Examinations</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-[#f8f9fa] pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 sm:w-72" placeholder="Search exams" />
          </div>
          <button type="button" onClick={loadExaminations} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 text-sm font-bold text-brand-700">
            <RefreshCcw size={16} /> Refresh
          </button>
          {canCreate && (
            <button type="button" onClick={() => (activeTab === 'schedules' ? setScheduleModalRecord(null) : setExamModalRecord(null))} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white">
              <Plus size={16} /> {activeTab === 'schedules' ? 'New Schedule' : 'Create Exam'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<BookOpenCheck size={20} className="text-brand-500" />} label="Exams" loading={loading} value={exams.length} />
        <SummaryCard icon={<CalendarDays size={20} className="text-brand-500" />} label="Schedules" loading={loading} value={visibleSchedules.length} />
        <SummaryCard icon={<ClipboardList size={20} className="text-brand-500" />} label="Marks Entries" loading={loading} value={marksEntered} />
        <SummaryCard icon={<ShieldCheck size={20} className="text-brand-500" />} label="Verified Sets" loading={loading} value={verifiedGroups} />
      </div>

      <div className="my-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cx(
                'inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition',
                activeTab === tab.id ? 'bg-brand-700 text-white shadow-[0_12px_28px_rgba(0,77,77,.18)]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'exams' && (
        <ExamsTable
          canCreate={canCreate}
          exams={visibleExams}
          loading={loading}
          onArchive={archiveExamRecord}
          onEdit={setExamModalRecord}
        />
      )}

      {activeTab === 'schedules' && (
        <SchedulesTable
          canCreate={canCreate}
          loading={loading}
          onArchive={archiveScheduleRecord}
          onEdit={setScheduleModalRecord}
          schedules={visibleSchedules}
        />
      )}

      {activeTab === 'marks' && (
        <MarksPanel
          canEnterMarks={canEnterMarks}
          canVerify={canVerify}
          classes={classes}
          currentMarks={currentMarks}
          drafts={markDrafts}
          exams={exams}
          loading={loading}
          maxMarks={effectiveMarksMaxMarks}
          onSave={saveMarks}
          onSelectSchedule={selectSchedule}
          onSetMaxMarks={setMarksMaxMarks}
          onUnlock={unlockCurrentMarks}
          onUpdateDraft={updateDraft}
          onVerify={verifyCurrentMarks}
          schedules={visibleSchedules}
          selectedClassId={effectiveClassId}
          selectedExamId={effectiveExamId}
          selectedScheduleId={selectedScheduleId}
          selectedSubjectId={effectiveSubjectId}
          setSelectedClassId={chooseClass}
          setSelectedExamId={chooseExam}
          setSelectedSubjectId={chooseSubject}
          students={classStudents}
          subjects={subjects}
          saving={Boolean(saving)}
        />
      )}

      {examModalRecord !== undefined && (
        <ExamModal
          academicYear={effectiveAcademicYear}
          initialRecord={examModalRecord}
          onClose={() => setExamModalRecord(undefined)}
          onSave={saveExamRecord}
          saving={saving === 'exam'}
        />
      )}

      {scheduleModalRecord !== undefined && (
        <ScheduleModal
          academicYear={effectiveAcademicYear}
          classes={classes}
          exams={exams}
          initialRecord={scheduleModalRecord}
          onClose={() => setScheduleModalRecord(undefined)}
          onSave={saveScheduleRecord}
          saving={saving === 'schedule'}
          subjects={subjects}
        />
      )}
    </div>
  );
}
