import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SplitSquareHorizontal,
  UserRoundCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  archiveAcademicResource,
  createAcademicResource,
  getCurrentAcademicYear,
  listAcademicResource,
  restoreAcademicResource,
  setCurrentAcademicYear,
  updateAcademicResource,
} from '../../api/academics';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';

const resourceTabs = [
  { id: 'academicYears', label: 'Academic Years', icon: CalendarDays, singular: 'Academic Year' },
  { id: 'courses', label: 'Courses', icon: GraduationCap, singular: 'Course' },
  { id: 'classes', label: 'Classes', icon: Layers3, singular: 'Class' },
  { id: 'sections', label: 'Sections', icon: SplitSquareHorizontal, singular: 'Section' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, singular: 'Subject' },
  { id: 'teacherAllocations', label: 'Teacher Allocations', icon: UserRoundCheck, singular: 'Teacher Allocation' },
];

const initialState = {
  academicYears: [],
  courses: [],
  classes: [],
  sections: [],
  subjects: [],
  teacherAllocations: [],
};

const fieldConfig = {
  academicYears: [
    { key: 'name', label: 'Academic Year', required: true, placeholder: '2026-2027' },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'workingDays', label: 'Working Days', placeholder: 'Monday, Tuesday, Wednesday' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
    { key: 'isCurrent', label: 'Current Year', type: 'checkbox' },
  ],
  courses: [
    { key: 'name', label: 'Course Name', required: true },
    { key: 'code', label: 'Course Code' },
    { key: 'academicYear', label: 'Academic Year', required: true, type: 'academicYearSelect' },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  ],
  classes: [
    { key: 'name', label: 'Class Name', required: true },
    { key: 'courseId', label: 'Course', type: 'courseSelect' },
    { key: 'academicYear', label: 'Academic Year', required: true, type: 'academicYearSelect' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  ],
  sections: [
    { key: 'name', label: 'Section Name', required: true },
    { key: 'classId', label: 'Class', required: true, type: 'classSelect' },
    { key: 'capacity', label: 'Capacity', type: 'number' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  ],
  subjects: [
    { key: 'name', label: 'Subject Name', required: true },
    { key: 'code', label: 'Subject Code' },
    { key: 'credits', label: 'Credits', type: 'number' },
    { key: 'classId', label: 'Class', type: 'classSelect' },
    { key: 'courseId', label: 'Course', type: 'courseSelect' },
    { key: 'academicYear', label: 'Academic Year', type: 'academicYearSelect' },
    { key: 'assignedTeacherId', label: 'Assigned Teacher ID' },
    { key: 'assignedTeacherName', label: 'Assigned Teacher Name' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  ],
  teacherAllocations: [
    { key: 'teacherId', label: 'Teacher ID', required: true },
    { key: 'teacherName', label: 'Teacher Name' },
    { key: 'subjectId', label: 'Subject', required: true, type: 'subjectSelect' },
    { key: 'classId', label: 'Class', type: 'classSelect' },
    { key: 'sectionId', label: 'Section', type: 'sectionSelect' },
    { key: 'academicYear', label: 'Academic Year', type: 'academicYearSelect' },
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
  ],
};

const emptyForm = {
  status: 'active',
  isCurrent: false,
};

function displayStatus(item) {
  if (item.archived) return 'archived';
  return item.status || 'active';
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'archived') return 'bg-slate-100 text-slate-600 border-slate-200';
  if (normalized === 'inactive') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function labelFor(list, id, fallback = '-') {
  if (!id) return fallback;
  return list.find((item) => item.id === id)?.name || fallback;
}

function normalizeFormPayload(resource, form, data) {
  const payload = {};
  fieldConfig[resource].forEach((field) => {
    const value = form[field.key];
    if (value === undefined) return;
    if (field.type === 'checkbox') {
      payload[field.key] = Boolean(value);
      return;
    }
    if (field.type === 'number') {
      payload[field.key] = value === '' ? undefined : Number(value);
      return;
    }
    if (field.key === 'workingDays') {
      payload.workingDays = Array.isArray(value)
        ? value
        : String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      return;
    }
    payload[field.key] = typeof value === 'string' ? value.trim() : value;
  });

  if (resource === 'classes' && payload.courseId) {
    const course = data.courses.find((item) => item.id === payload.courseId);
    payload.courseName = course?.name || form.courseName || '';
  }

  if (resource === 'sections' && payload.classId) {
    const klass = data.classes.find((item) => item.id === payload.classId);
    payload.className = klass?.name || form.className || '';
    payload.academicYear = klass?.academicYear || form.academicYear || payload.academicYear;
  }

  if (resource === 'subjects' && payload.classId) {
    const klass = data.classes.find((item) => item.id === payload.classId);
    payload.className = klass?.name || form.className || '';
    payload.academicYear = payload.academicYear || klass?.academicYear || '';
  }

  if (resource === 'teacherAllocations') {
    const subject = data.subjects.find((item) => item.id === payload.subjectId);
    const klass = data.classes.find((item) => item.id === payload.classId);
    const section = data.sections.find((item) => item.id === payload.sectionId);
    payload.subjectName = subject?.name || form.subjectName || '';
    payload.className = klass?.name || subject?.className || form.className || '';
    payload.sectionName = section?.name || form.sectionName || '';
    payload.academicYear = payload.academicYear || subject?.academicYear || klass?.academicYear || '';
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });
  return payload;
}

function validatePayload(resource, payload) {
  const missing = fieldConfig[resource].find((field) => field.required && !payload[field.key]);
  return missing ? `${missing.label} is required.` : '';
}

function AcademicsModal({ activeResource, data, defaultAcademicYear, initialRecord, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    academicYear: defaultAcademicYear || '',
    ...initialRecord,
    workingDays: Array.isArray(initialRecord?.workingDays) ? initialRecord.workingDays.join(', ') : initialRecord?.workingDays || '',
  }));
  const config = resourceTabs.find((item) => item.id === activeResource);
  const isEdit = Boolean(initialRecord?.id);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = normalizeFormPayload(activeResource, form, data);
    const validation = validatePayload(activeResource, payload);
    if (validation) {
      toast.error(validation);
      return;
    }
    onSave(payload);
  };

  const renderField = (field) => {
    const value = form[field.key] ?? (field.type === 'checkbox' ? false : '');
    const commonClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100';

    if (field.type === 'textarea') {
      return <textarea value={value} onChange={(event) => update(field.key, event.target.value)} className={`${commonClass} py-3`} rows={3} placeholder={field.placeholder || field.label} />;
    }

    if (field.type === 'select') {
      return (
        <select value={value || 'active'} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      );
    }

    if (field.type === 'academicYearSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          <option value="">Select academic year</option>
          {data.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
        </select>
      );
    }

    if (field.type === 'courseSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          <option value="">Select course</option>
          {data.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      );
    }

    if (field.type === 'classSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          <option value="">Select class</option>
          {data.classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
        </select>
      );
    }

    if (field.type === 'sectionSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          <option value="">Select section</option>
          {data.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
        </select>
      );
    }

    if (field.type === 'subjectSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass}>
          <option value="">Select subject</option>
          {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      );
    }

    if (field.type === 'checkbox') {
      return (
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm font-semibold text-slate-900">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => update(field.key, event.target.checked)} className="h-4 w-4 rounded border-slate-200 text-emerald-600" />
          Mark as current
        </label>
      );
    }

    return <input type={field.type || 'text'} value={value} onChange={(event) => update(field.key, event.target.value)} className={commonClass} placeholder={field.placeholder || field.label} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,.15)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-500">Academics</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{isEdit ? 'Edit' : 'Create'} {config.singular}</h2>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">×</button>
        </div>
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          {fieldConfig[activeResource].map((field) => (
            <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
              <span className="mb-1.5 block text-xs font-bold text-slate-500">
                {field.label}{field.required ? ' *' : ''}
              </span>
              {renderField(field)}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-bold text-slate-500">Cancel</button>
          <button type="submit" className="h-10 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
            Save {config.singular}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AcademicsManagement({ currentUser, academicYear = '' }) {
  const [data, setData] = useState(initialState);
  const [activeResource, setActiveResource] = useState('academicYears');
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [currentYear, setCurrentYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalRecord, setModalRecord] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const currentRoleId = currentUser?.roleId || 'admin';
  const canManage = canAccess(defaultRoles, currentRoleId, 'academics.manage');
  const activeTab = resourceTabs.find((item) => item.id === activeResource);
  const defaultAcademicYear = currentYear?.name || academicYear || data.academicYears[0]?.name || '';

  const loadAcademics = async () => {
    setLoading(true);
    try {
      const [nextCurrentYear, academicYears, courses, classes, sections, subjects, teacherAllocations] = await Promise.all([
        getCurrentAcademicYear().catch(() => null),
        listAcademicResource('academicYears', { includeArchived }),
        listAcademicResource('courses', { includeArchived }),
        listAcademicResource('classes', { includeArchived }),
        listAcademicResource('sections', { includeArchived }),
        listAcademicResource('subjects', { includeArchived }),
        listAcademicResource('teacherAllocations', { includeArchived }),
      ]);
      setCurrentYear(nextCurrentYear);
      setData({ academicYears, courses, classes, sections, subjects, teacherAllocations });
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend academics data.', error);
      setLoadError(error?.message || 'Unable to load academics from the backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadAcademics();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeArchived]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = data[activeResource] || [];
    if (!term) return items;
    return items.filter((item) =>
      [
        item.name,
        item.code,
        item.academicYear,
        item.description,
        item.courseName,
        item.className,
        item.sectionName,
        item.assignedTeacherName,
        item.teacherName,
        item.teacherId,
        item.subjectName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [activeResource, data, search]);

  const snapshot = {
    academicYears: data.academicYears.length,
    courses: data.courses.length,
    classes: data.classes.length,
    sections: data.sections.length,
    subjects: data.subjects.length,
    teacherAllocations: data.teacherAllocations.length,
  };

  const openCreate = () => {
    setModalRecord(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setModalRecord(record);
    setModalOpen(true);
  };

  const saveRecord = async (payload) => {
    if (!canManage) {
      toast.error('You do not have permission to manage academics.');
      return;
    }
    setSaving(true);
    try {
      const saved = modalRecord?.id
        ? await updateAcademicResource(activeResource, modalRecord.id, payload)
        : await createAcademicResource(activeResource, payload);
      setData((current) => ({
        ...current,
        [activeResource]: modalRecord?.id
          ? current[activeResource].map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current[activeResource]],
      }));
      if (activeResource === 'academicYears' && saved.isCurrent) setCurrentYear(saved);
      setModalOpen(false);
      toast.success(`${activeTab.singular} saved`);
    } catch (error) {
      console.error('Unable to save academic record.', error);
      toast.error(error?.message || `${activeTab.singular} was not saved.`);
    } finally {
      setSaving(false);
    }
  };

  const archiveOrRestore = async (record) => {
    if (!canManage) {
      toast.error('You do not have permission to manage academics.');
      return;
    }
    try {
      if (record.archived) {
        await restoreAcademicResource(activeResource, record.id);
        toast.success(`${activeTab.singular} restored`);
      } else {
        await archiveAcademicResource(activeResource, record.id);
        toast.success(`${activeTab.singular} archived`);
      }
      await loadAcademics();
    } catch (error) {
      toast.error(error?.message || `${activeTab.singular} was not updated.`);
    }
  };

  const markCurrentYear = async (record) => {
    if (!canManage) {
      toast.error('You do not have permission to manage academics.');
      return;
    }
    try {
      const updated = await setCurrentAcademicYear(record.id);
      setCurrentYear(updated);
      await loadAcademics();
      toast.success('Current academic year updated');
    } catch (error) {
      toast.error(error?.message || 'Academic year was not updated.');
    }
  };

  const renderCells = (item) => {
    if (activeResource === 'academicYears') {
      return [
        item.name,
        [item.startDate, item.endDate].filter(Boolean).join(' to ') || '-',
        Array.isArray(item.workingDays) ? item.workingDays.join(', ') : '-',
      ];
    }
    if (activeResource === 'courses') return [item.name, item.code || '-', item.academicYear || '-'];
    if (activeResource === 'classes') return [item.name, item.courseName || labelFor(data.courses, item.courseId), item.academicYear || '-'];
    if (activeResource === 'sections') return [item.name, item.className || labelFor(data.classes, item.classId), item.capacity || '-'];
    if (activeResource === 'subjects') return [item.name, item.code || '-', item.className || labelFor(data.classes, item.classId)];
    return [item.teacherName || item.teacherId, item.subjectName || labelFor(data.subjects, item.subjectId), item.className || labelFor(data.classes, item.classId)];
  };

  return (
    <div className="erp-academics-page min-w-0">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academics</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!canManage || loading || saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus size={17} /> Add {activeTab.singular}
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 space-y-6 lg:col-span-3">
          <section className="tt-card relative overflow-hidden rounded-2xl p-6">
            <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500">Current Cycle</span>
              <CalendarDays className="text-emerald-600" size={20} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">{currentYear?.name || defaultAcademicYear || '-'}</h2>
            <p className="mt-1 text-sm text-slate-500">{currentYear?.startDate ? `Starts ${currentYear.startDate}` : 'No current academic year selected.'}</p>
          </section>

          <section className="tt-card p-2">
            {resourceTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeResource === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveResource(tab.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition last:mb-0 ${
                    active ? 'bg-brand-700 font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]' : 'text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </section>

          <section className="tt-card p-6">
            <p className="mb-4 text-[11px] font-bold uppercase text-slate-500">Backend Module Snapshot</p>
            <div className="space-y-3">
              {resourceTabs.map((tab) => (
                <div key={tab.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{tab.label}</span>
                    <b className="text-slate-800">{loading ? '-' : snapshot[tab.id]}</b>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-50">
                    <div className="h-full rounded-full bg-brand-700" style={{ width: `${Math.min(100, Math.max(8, snapshot[tab.id] * 12))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="tt-card col-span-12 overflow-hidden rounded-2xl lg:col-span-9">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{activeTab.label}</h2>
              <p className="text-sm text-slate-500">Create, update, archive, and restore records supported by `/api/academics`.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
                <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-200 text-emerald-600" />
                Include archived
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${activeTab.label.toLowerCase()}...`}
                  className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:w-72"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <th className="border-b border-slate-100 px-5 py-4">Name</th>
                  <th className="border-b border-slate-100 px-5 py-4">Reference</th>
                  <th className="border-b border-slate-100 px-5 py-4">Context</th>
                  <th className="border-b border-slate-100 px-5 py-4">Status</th>
                  <th className="border-b border-slate-100 px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2 font-semibold"><Loader2 className="animate-spin" size={16} /> Loading academics...</span>
                    </td>
                  </tr>
                )}
                {!loading && rows.map((item) => {
                  const [name, reference, context] = renderCells(item);
                  const status = displayStatus(item);
                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4 font-bold text-slate-900">{name || '-'}</td>
                      <td className="px-5 py-4 text-slate-500">{reference || '-'}</td>
                      <td className="px-5 py-4 text-slate-500">{context || '-'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${statusClasses(status)}`}>
                          {status}
                        </span>
                        {activeResource === 'academicYears' && item.isCurrent && (
                          <span className="ml-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase text-emerald-700">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {activeResource === 'academicYears' && !item.archived && !item.isCurrent && (
                            <button type="button" onClick={() => markCurrentYear(item)} disabled={!canManage} className="h-9 w-9 rounded-lg bg-slate-50 text-emerald-600 hover:bg-white disabled:opacity-40" title="Set current">
                              <CheckCircle2 className="mx-auto" size={16} />
                            </button>
                          )}
                          <button type="button" onClick={() => openEdit(item)} disabled={!canManage || item.archived} className="h-9 w-9 rounded-lg bg-slate-50 text-slate-500 hover:bg-white disabled:opacity-40" title="Edit">
                            <Pencil className="mx-auto" size={16} />
                          </button>
                          <button type="button" onClick={() => archiveOrRestore(item)} disabled={!canManage} className="h-9 w-9 rounded-lg bg-slate-50 text-slate-500 hover:bg-white disabled:opacity-40" title={item.archived ? 'Restore' : 'Archive'}>
                            {item.archived ? <RotateCcw className="mx-auto" size={16} /> : <Archive className="mx-auto" size={16} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !rows.length && (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500">No {activeTab.label.toLowerCase()} found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalOpen && (
        <AcademicsModal
          activeResource={activeResource}
          data={data}
          defaultAcademicYear={defaultAcademicYear}
          initialRecord={modalRecord}
          onClose={() => setModalOpen(false)}
          onSave={saveRecord}
        />
      )}
    </div>
  );
}
