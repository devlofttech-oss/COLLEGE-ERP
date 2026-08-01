import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Layers3,
  Loader2,
  Plus,
  RefreshCcw,
  UserRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import { listStaff } from '../../api/staff';
import {
  archivePeriod,
  archiveTimetableEntry,
  createPeriod,
  createTimetableEntry,
  getClassTimetable,
  getTeacherTimetable,
  listPeriods,
  listTimetableEntries,
  updatePeriod,
  updateTimetableEntry,
} from '../../api/timetable';
import {
  DAYS,
  compactPayload,
  displayPeriodRange,
  groupTimetableByDay,
  sortPeriods,
  validateTimetableEntry,
  validateTimetablePeriod,
} from './timetableUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const VIEW_TABS = [
  { id: 'class', label: 'Class View', icon: Layers3 },
  { id: 'teacher', label: 'Teacher View', icon: UserRound },
  { id: 'periods', label: 'Periods', icon: Clock3 },
];
const STATUS_OPTIONS = ['active', 'inactive'];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function activeItems(items = []) {
  return items.filter((item) => !item.archived && String(item.status || 'active').toLowerCase() !== 'inactive');
}

function classLabel(klass = {}) {
  return [klass.name, klass.courseName].filter(Boolean).join(' - ') || klass.id;
}

function sectionLabel(section = {}) {
  return [section.name, section.className].filter(Boolean).join(' - ') || section.id;
}

function subjectLabel(subject = {}) {
  return [subject.name, subject.code].filter(Boolean).join(' - ') || subject.id;
}

function teacherLabel(teacher = {}) {
  return [teacher.name, teacher.employeeId].filter(Boolean).join(' - ') || teacher.id;
}

function selectedLabel(item, labeler) {
  return item ? labeler(item) : '-';
}

function statusClasses(value) {
  const normalized = String(value || 'active').toLowerCase();
  if (normalized === 'inactive') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
}

function roomClasses(room = '') {
  const normalized = String(room).toLowerCase();
  if (normalized.includes('lab')) return 'border-[#e9a43c] bg-[#e9a43c]/10 text-[#633f00]';
  return 'border-[#006a62] bg-[#006a62]/10 text-[#006a62]';
}

async function optionalLoad(loader, fallback) {
  try {
    return await loader();
  } catch (error) {
    console.warn('Optional timetable support data did not load.', error);
    return fallback;
  }
}

function flattenGroupedTimetable(grouped = {}) {
  return DAYS.flatMap((day) => grouped[day] || []);
}

function ModalFrame({ children, footer, maxWidth = 'max-w-3xl', onClose, subtitle, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071e27]/50 p-4 backdrop-blur-sm">
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-2xl border border-white/35 bg-[#f3faff]/90 shadow-[0_30px_90px_rgba(7,30,39,.22)] backdrop-blur-2xl', maxWidth)}>
        <div className="flex items-start justify-between border-b border-white/35 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Timetable</p>
            <h2 className="mt-1 text-xl font-bold text-[#003434]">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-[#3f4848]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/45 text-[#3f4848] hover:bg-white" aria-label="Close">
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
    <div className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-['Montserrat'] text-2xl font-bold text-[#003434]">{loading ? '-' : value}</div>
    </div>
  );
}

function PeriodModal({ initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    name: initialRecord?.name || '',
    startTime: initialRecord?.startTime || '',
    endTime: initialRecord?.endTime || '',
    order: initialRecord?.order ?? '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = compactPayload({
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      order: form.order === '' ? undefined : Number(form.order),
      status: form.status || undefined,
    });
    const validationMessage = validateTimetablePeriod(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Period' : 'Add Period'}
        subtitle={isEdit ? initialRecord.name : 'Creates a backend timetable period.'}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              <CheckCircle2 size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Name *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} placeholder="Period 1" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Order</span>
            <input type="number" min="0" value={form.order} onChange={(event) => update('order', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Start Time *</span>
            <input type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">End Time *</span>
            <input type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function EntryModal({
  academicYear,
  classes,
  conflicts,
  initialRecord,
  initialValues,
  onClose,
  onSave,
  periods,
  saving,
  sections,
  subjects,
  teachers,
}) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    day: initialRecord?.day || initialValues?.day || DAYS[0],
    periodId: initialRecord?.periodId || initialValues?.periodId || periods[0]?.id || '',
    classId: initialRecord?.classId || initialValues?.classId || classes[0]?.id || '',
    sectionId: initialRecord?.sectionId || initialValues?.sectionId || '',
    subjectId: initialRecord?.subjectId || initialValues?.subjectId || '',
    teacherId: initialRecord?.teacherId || initialValues?.teacherId || '',
    room: initialRecord?.room || initialValues?.room || '',
    academicYear: initialRecord?.academicYear || academicYear || '',
    status: initialRecord?.status || 'active',
    force: false,
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const selectedClass = classes.find((item) => item.id === form.classId);
  const classSections = sections.filter((section) => !form.classId || section.classId === form.classId);
  const classSubjects = subjects.filter((subject) => !form.classId || subject.classId === form.classId || !subject.classId);
  const selectedPeriod = periods.find((item) => item.id === form.periodId);
  const selectedSection = sections.find((item) => item.id === form.sectionId);
  const selectedSubject = subjects.find((item) => item.id === form.subjectId);
  const selectedTeacher = teachers.find((item) => item.id === form.teacherId);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateClass = (classId) => {
    const nextSections = sections.filter((section) => !classId || section.classId === classId);
    const nextSubjects = subjects.filter((subject) => !classId || subject.classId === classId || !subject.classId);
    setForm((current) => ({
      ...current,
      classId,
      sectionId: nextSections.some((section) => section.id === current.sectionId) ? current.sectionId : '',
      subjectId: nextSubjects.some((subject) => subject.id === current.subjectId) ? current.subjectId : '',
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = compactPayload({
      day: form.day,
      periodId: form.periodId,
      periodName: selectedPeriod?.name || initialRecord?.periodName || null,
      classId: form.classId,
      className: selectedClass?.name || initialRecord?.className || null,
      sectionId: form.sectionId || null,
      sectionName: selectedSection?.name || initialRecord?.sectionName || null,
      subjectId: form.subjectId,
      subjectName: selectedSubject?.name || initialRecord?.subjectName || null,
      teacherId: form.teacherId || null,
      teacherName: selectedTeacher?.name || initialRecord?.teacherName || null,
      room: form.room.trim() || null,
      academicYear: form.academicYear.trim() || selectedClass?.academicYear || selectedSubject?.academicYear || null,
      status: form.status || null,
    });
    const validationMessage = validateTimetableEntry(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(payload, { force: form.force });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Slot' : 'Add Slot'}
        subtitle={isEdit ? `${initialRecord.subjectName || initialRecord.subjectId} | ${initialRecord.day}` : 'Creates a backend timetable entry.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white disabled:bg-slate-300">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Day *</span>
            <select value={form.day} onChange={(event) => update('day', event.target.value)} className={inputClass}>
              {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Period *</span>
            <select value={form.periodId} onChange={(event) => update('periodId', event.target.value)} className={inputClass}>
              <option value="">Select period</option>
              {periods.map((period) => <option key={period.id} value={period.id}>{period.name} | {displayPeriodRange(period)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class *</span>
            <select value={form.classId} onChange={(event) => updateClass(event.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
            <select value={form.sectionId} onChange={(event) => update('sectionId', event.target.value)} className={inputClass}>
              <option value="">No section</option>
              {classSections.map((section) => <option key={section.id} value={section.id}>{sectionLabel(section)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Subject *</span>
            <select value={form.subjectId} onChange={(event) => update('subjectId', event.target.value)} className={inputClass}>
              <option value="">Select subject</option>
              {classSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subjectLabel(subject)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Teacher</span>
            <select value={form.teacherId} onChange={(event) => update('teacherId', event.target.value)} className={inputClass}>
              <option value="">No teacher</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Room</span>
            <input value={form.room} onChange={(event) => update('room', event.target.value)} className={inputClass} placeholder="Room 302" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
            <input value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-white/35 bg-white/35 px-4 py-3">
            <input type="checkbox" checked={form.force} onChange={(event) => update('force', event.target.checked)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
            <span className="text-sm font-bold text-[#003434]">Override conflict check</span>
          </label>
          {conflicts.length > 0 && (
            <div className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <div className="flex items-center gap-2 font-bold"><AlertTriangle size={16} /> Conflict detected</div>
              <p className="mt-1 text-xs font-semibold">{conflicts.join(' ')}</p>
            </div>
          )}
        </div>
      </ModalFrame>
    </form>
  );
}

function ScheduleGrid({ canManage, entriesByDay, loading, onArchive, onCreate, onEdit, periods }) {
  const activePeriods = sortPeriods(activeItems(periods));

  if (loading) {
    return (
      <section className="erp-glass-card rounded-2xl p-10 text-center text-sm font-semibold text-[#3f4848]">
        <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading timetable...
      </section>
    );
  }

  if (!activePeriods.length) {
    return (
      <section className="erp-glass-card rounded-2xl p-10 text-center">
        <Clock3 className="mx-auto text-[#006a62]" size={28} />
        <h2 className="mt-3 text-lg font-bold text-[#003434]">No periods found</h2>
        <p className="mt-1 text-sm font-semibold text-[#3f4848]">Create periods before adding timetable slots.</p>
      </section>
    );
  }

  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-32 border-b border-white/25 bg-white/30 px-4 py-4 text-left text-[11px] font-bold uppercase text-[#3f4848]">Time</th>
              {DAYS.map((day) => (
                <th key={day} className="border-b border-white/25 bg-white/30 px-4 py-4 text-center text-[11px] font-bold uppercase text-[#003434]">{day.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activePeriods.map((period) => (
              <tr key={period.id}>
                <td className="border-b border-r border-white/25 px-4 py-4 align-top">
                  <span className="block text-[11px] font-bold uppercase text-[#6f7978]">{period.name}</span>
                  <span className="mt-1 block text-sm font-bold text-[#003434]">{displayPeriodRange(period)}</span>
                </td>
                {DAYS.map((day) => {
                  const cellEntries = (entriesByDay[day] || []).filter((entry) => entry.periodId === period.id);
                  return (
                    <td key={`${period.id}-${day}`} className="group min-h-24 border-b border-r border-white/25 p-2 align-top hover:bg-white/25">
                      <div className="space-y-2">
                        {cellEntries.map((entry) => (
                          <div key={entry.id} className={cx('rounded-r-xl border-l-4 p-3', roomClasses(entry.room))}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#003434]">{entry.subjectName || entry.subjectId}</p>
                                <p className="mt-1 truncate text-xs text-[#3f4848]">{entry.teacherName || valueOrDash(entry.teacherId)}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase text-current">{entry.room || 'No room'}</p>
                              </div>
                            </div>
                            {canManage && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button type="button" onClick={() => onEdit(entry)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/65 px-3 text-xs font-bold text-[#004d4d]">
                                  <Edit3 size={13} /> Edit
                                </button>
                                <button type="button" onClick={() => onArchive(entry)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/65 px-3 text-xs font-bold text-[#004d4d]">
                                  <Archive size={13} /> Archive
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {!cellEntries.length && canManage && (
                          <button
                            type="button"
                            onClick={() => onCreate({ day, periodId: period.id })}
                            className="flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-white/45 bg-white/20 text-xs font-bold text-[#6f7978] hover:border-[#006a62] hover:text-[#006a62]"
                          >
                            <Plus size={14} className="mr-1" /> Add slot
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PeriodsPanel({ canManage, loading, onAdd, onArchive, onEdit, periods }) {
  const visiblePeriods = sortPeriods(periods);
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Periods</h2>
        {canManage && <button type="button" onClick={onAdd} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white"><Plus size={14} /> Add Period</button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[#004d4d] text-left text-white">
            <tr>
              <th className="px-5 py-3">Period</th>
              <th className="px-5 py-3">Start</th>
              <th className="px-5 py-3">End</th>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading periods...</td></tr>}
            {!loading && visiblePeriods.map((period) => (
              <tr key={period.id}>
                <td className="px-5 py-4 font-bold text-[#071e27]">{period.name}</td>
                <td className="px-5 py-4 text-[#3f4848]">{period.startTime}</td>
                <td className="px-5 py-4 text-[#3f4848]">{period.endTime}</td>
                <td className="px-5 py-4 text-[#3f4848]">{period.order ?? '-'}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(period.status))}>{period.status || 'active'}</span></td>
                <td className="px-5 py-4">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(period)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Edit3 size={13} /> Edit</button>
                      <button type="button" onClick={() => onArchive(period)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Archive size={13} /> Archive</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !visiblePeriods.length && <tr><td colSpan="6" className="px-5 py-12 text-center text-sm font-semibold text-[#3f4848]">No periods found.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TimetableManagement({
  academicYear = '',
  currentUser,
  selectedCourse = null,
}) {
  const [activeView, setActiveView] = useState('class');
  const [periods, setPeriods] = useState([]);
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [scopedTimetable, setScopedTimetable] = useState({});
  const [loading, setLoading] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [periodModalRecord, setPeriodModalRecord] = useState(undefined);
  const [entryModalRecord, setEntryModalRecord] = useState(undefined);
  const [entryDefaults, setEntryDefaults] = useState({});
  const [entryConflicts, setEntryConflicts] = useState([]);

  const canView = hasPermission(currentUser, 'timetable.view') || hasPermission(currentUser, 'timetable.viewOwn');
  const canManage = hasPermission(currentUser, 'timetable.manage');
  const effectiveAcademicYear = academicYear || selectedCourse?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || '';

  const loadTimetable = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextPeriods, nextEntries] = await Promise.all([
        listPeriods(),
        listTimetableEntries({ academicYear: effectiveAcademicYear }),
      ]);
      const classParams = { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' };
      const subjectParams = { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' };
      const [nextClasses, nextSections, nextSubjects, nextStaff] = await Promise.all([
        optionalLoad(() => listAcademicResource('classes', classParams), []),
        optionalLoad(() => listAcademicResource('sections', { academicYear: effectiveAcademicYear, status: 'active' }), []),
        optionalLoad(() => listAcademicResource('subjects', subjectParams), []),
        optionalLoad(() => listStaff({ type: 'teaching', status: 'active' }), { staff: [] }),
      ]);
      setPeriods(nextPeriods);
      setEntries(nextEntries);
      setClasses(activeItems(nextClasses));
      setSections(activeItems(nextSections));
      setSubjects(activeItems(nextSubjects));
      setTeachers(activeItems(nextStaff.staff || []));
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend timetable data.', error);
      setLoadError(error?.message || 'Unable to load timetable from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, effectiveAcademicYear, effectiveCourseId]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadTimetable();
    });
    return () => {
      active = false;
    };
  }, [loadTimetable]);

  const effectiveClassId = useMemo(() => (
    selectedClassId && classes.some((klass) => klass.id === selectedClassId)
      ? selectedClassId
      : classes[0]?.id || ''
  ), [classes, selectedClassId]);
  const selectedClass = useMemo(() => classes.find((klass) => klass.id === effectiveClassId) || null, [classes, effectiveClassId]);
  const sectionOptions = useMemo(() => sections.filter((section) => !effectiveClassId || section.classId === effectiveClassId), [effectiveClassId, sections]);
  const effectiveSectionId = useMemo(() => (
    selectedSectionId && sectionOptions.some((section) => section.id === selectedSectionId) ? selectedSectionId : ''
  ), [sectionOptions, selectedSectionId]);
  const effectiveTeacherId = useMemo(() => (
    selectedTeacherId && teachers.some((teacher) => teacher.id === selectedTeacherId)
      ? selectedTeacherId
      : teachers[0]?.id || ''
  ), [selectedTeacherId, teachers]);
  const selectedTeacher = useMemo(() => teachers.find((teacher) => teacher.id === effectiveTeacherId) || null, [effectiveTeacherId, teachers]);

  useEffect(() => {
    let active = true;
    const loadScopedView = async () => {
      if (!canView || activeView === 'periods') {
        setScopedTimetable(groupTimetableByDay(entries));
        return;
      }
      setViewLoading(true);
      try {
        if (activeView === 'class' && effectiveClassId) {
          const next = await getClassTimetable({
            classId: effectiveClassId,
            sectionId: effectiveSectionId,
            academicYear: effectiveAcademicYear,
          });
          if (active) setScopedTimetable(next);
          return;
        }
        if (activeView === 'teacher' && effectiveTeacherId) {
          const next = await getTeacherTimetable({
            teacherId: effectiveTeacherId,
            academicYear: effectiveAcademicYear,
          });
          if (active) setScopedTimetable(next);
          return;
        }
        if (active) setScopedTimetable(groupTimetableByDay(entries));
      } catch (error) {
        console.error('Unable to load scoped timetable view.', error);
        if (active) setScopedTimetable(groupTimetableByDay(entries));
      } finally {
        if (active) setViewLoading(false);
      }
    };
    loadScopedView();
    return () => {
      active = false;
    };
  }, [activeView, canView, effectiveAcademicYear, effectiveClassId, effectiveSectionId, effectiveTeacherId, entries]);

  const viewEntries = useMemo(() => flattenGroupedTimetable(scopedTimetable), [scopedTimetable]);
  const summary = useMemo(() => {
    const activePeriods = activeItems(periods).length;
    const activeEntries = entries.filter((entry) => !entry.archived).length;
    const activeTeachers = new Set(entries.map((entry) => entry.teacherId).filter(Boolean)).size;
    const activeDays = new Set(entries.map((entry) => entry.day).filter(Boolean)).size;
    return { activePeriods, activeEntries, activeTeachers, activeDays };
  }, [entries, periods]);

  const openEntryModal = (defaults = {}) => {
    setEntryDefaults(defaults);
    setEntryConflicts([]);
    setEntryModalRecord(null);
  };

  const savePeriod = async (payload) => {
    const isEdit = Boolean(periodModalRecord?.id);
    if (!canManage) {
      toast.error('You do not have permission to manage timetable periods.');
      return;
    }
    setSaving(true);
    try {
      await (isEdit ? updatePeriod(periodModalRecord.id, payload) : createPeriod(payload));
      toast.success(isEdit ? 'Period updated' : 'Period created');
      setPeriodModalRecord(undefined);
      await loadTimetable();
    } catch (error) {
      toast.error(error?.message || 'Period was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveEntry = async (payload, options = {}) => {
    const isEdit = Boolean(entryModalRecord?.id);
    if (!canManage) {
      toast.error('You do not have permission to manage timetable entries.');
      return;
    }
    setSaving(true);
    setEntryConflicts([]);
    try {
      const result = await (isEdit
        ? updateTimetableEntry(entryModalRecord.id, payload, options)
        : createTimetableEntry(payload, options));
      toast.success(isEdit ? 'Timetable slot updated' : 'Timetable slot created');
      if (result.conflicts?.length) toast.success(`${result.conflicts.length} conflict override recorded`);
      setEntryModalRecord(undefined);
      setEntryDefaults({});
      await loadTimetable();
    } catch (error) {
      if (error?.status === 409) setEntryConflicts([error.message || 'Timetable conflict detected.']);
      toast.error(error?.message || 'Timetable slot was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const archivePeriodRecord = async (period) => {
    if (!canManage) {
      toast.error('You do not have permission to archive timetable periods.');
      return;
    }
    if (!window.confirm(`Archive ${period.name || 'this period'}?`)) return;
    try {
      await archivePeriod(period.id);
      toast.success('Period archived');
      await loadTimetable();
    } catch (error) {
      toast.error(error?.message || 'Period was not archived.');
    }
  };

  const archiveEntryRecord = async (entry) => {
    if (!canManage) {
      toast.error('You do not have permission to archive timetable entries.');
      return;
    }
    if (!window.confirm(`Archive ${entry.subjectName || 'this slot'}?`)) return;
    try {
      await archiveTimetableEntry(entry.id);
      toast.success('Timetable slot archived');
      await loadTimetable();
    } catch (error) {
      toast.error(error?.message || 'Timetable slot was not archived.');
    }
  };

  if (!canView) {
    return (
      <div className="erp-timetable-page min-w-0">
        <section className="erp-glass-card rounded-2xl p-8 text-center">
          <h1 className="font-['Montserrat'] text-2xl font-bold text-[#003434]">Timetable Management</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">You do not have permission to view timetable records.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="erp-timetable-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-[#3f4848]">
            <span>Academics</span>
            <span>/</span>
            <span className="text-[#006a62]">Timetable</span>
          </div>
          <h1 className="font-['Montserrat'] text-3xl font-bold text-[#003434]">Academic Schedule</h1>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadTimetable} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/40 px-4 text-sm font-bold text-[#004d4d]">
            <RefreshCcw size={17} /> Refresh
          </button>
          {canManage && activeView !== 'periods' && (
            <button type="button" onClick={() => openEntryModal()} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
              <Plus size={17} /> Add Slot
            </button>
          )}
        </div>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Periods" value={summary.activePeriods} loading={loading} icon={<Clock3 size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Slots" value={summary.activeEntries} loading={loading} icon={<CalendarDays size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Teachers" value={summary.activeTeachers} loading={loading} icon={<UserRound size={18} className="text-[#006a62]" />} />
        <SummaryCard label="Days" value={summary.activeDays} loading={loading} icon={<BookOpen size={18} className="text-[#006a62]" />} />
      </section>

      <section className="erp-glass-card mb-6 rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveView(tab.id)}
                  className={cx('inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold', activeView === tab.id ? 'bg-[#004d4d] text-white' : 'bg-white/40 text-[#3f4848]')}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeView === 'class' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
                <select value={effectiveClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">Select class</option>
                  {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
                <select value={effectiveSectionId} onChange={(event) => setSelectedSectionId(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All sections</option>
                  {sectionOptions.map((section) => <option key={section.id} value={section.id}>{sectionLabel(section)}</option>)}
                </select>
              </label>
            </div>
          )}

          {activeView === 'teacher' && (
            <label className="w-full max-w-sm">
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Teacher</span>
              <select value={effectiveTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                <option value="">Select teacher</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacherLabel(teacher)}</option>)}
              </select>
            </label>
          )}
        </div>
      </section>

      {activeView !== 'periods' && (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="erp-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-[#3f4848]">Academic Year</p>
              <p className="mt-1 text-sm font-bold text-[#003434]">{effectiveAcademicYear || '-'}</p>
            </div>
            <div className="erp-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-[#3f4848]">{activeView === 'class' ? 'Selected Class' : 'Selected Teacher'}</p>
              <p className="mt-1 text-sm font-bold text-[#003434]">{activeView === 'class' ? selectedLabel(selectedClass, classLabel) : selectedLabel(selectedTeacher, teacherLabel)}</p>
            </div>
            <div className="erp-glass-card rounded-2xl p-4">
              <p className="text-[11px] font-bold uppercase text-[#3f4848]">Visible Slots</p>
              <p className="mt-1 text-sm font-bold text-[#003434]">{viewLoading ? '-' : viewEntries.length}</p>
            </div>
          </section>

          <ScheduleGrid
            canManage={canManage}
            entriesByDay={groupTimetableByDay(viewEntries)}
            loading={loading || viewLoading}
            onArchive={archiveEntryRecord}
            onCreate={openEntryModal}
            onEdit={(entry) => {
              setEntryConflicts([]);
              setEntryDefaults({});
              setEntryModalRecord(entry);
            }}
            periods={periods}
          />
        </>
      )}

      {activeView === 'periods' && (
        <PeriodsPanel
          canManage={canManage}
          loading={loading}
          onAdd={() => setPeriodModalRecord(null)}
          onArchive={archivePeriodRecord}
          onEdit={setPeriodModalRecord}
          periods={periods}
        />
      )}

      {periodModalRecord !== undefined && (
        <PeriodModal
          initialRecord={periodModalRecord}
          onClose={() => setPeriodModalRecord(undefined)}
          onSave={savePeriod}
        />
      )}

      {entryModalRecord !== undefined && (
        <EntryModal
          academicYear={effectiveAcademicYear}
          classes={classes}
          conflicts={entryConflicts}
          initialRecord={entryModalRecord}
          initialValues={entryDefaults}
          onClose={() => {
            setEntryModalRecord(undefined);
            setEntryDefaults({});
            setEntryConflicts([]);
          }}
          onSave={saveEntry}
          periods={sortPeriods(activeItems(periods))}
          saving={saving}
          sections={sections}
          subjects={subjects}
          teachers={teachers}
        />
      )}
    </div>
  );
}
