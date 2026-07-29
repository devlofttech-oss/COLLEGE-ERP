import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileDown,
  FileText,
  GraduationCap,
  IdCard,
  Loader2,
  MoveRight,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import { presignUpload, uploadPresignedFile } from '../../api/files';
import {
  addStudentDocument,
  archiveStudent,
  bulkImportStudents,
  createStudent,
  exportStudents,
  getStudent,
  getStudentIdCard,
  listPlacementHistory,
  listStudentDocuments,
  promoteStudent,
  rejectStudentDocument,
  restoreStudent,
  studentIdCardPdfUrl,
  transferStudent,
  updateStudent,
  verifyStudentDocument,
  listStudents,
} from '../../api/students';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const STATUSES = ['active', 'inactive', 'alumni', 'transferred'];
const GENDERS = ['Male', 'Female', 'Other'];
const DOCUMENT_TYPES = ['photo', 'aadhar', 'tc', 'certificate', 'other'];

const studentFieldGroups = [
  {
    title: 'Admission',
    fields: [
      { key: 'admissionNumber', label: 'Admission No.' },
      { key: 'admissionDate', label: 'Admission Date', type: 'date' },
      { key: 'academicYear', label: 'Academic Year', type: 'academicYearSelect', required: true },
      { key: 'status', label: 'Status', type: 'statusSelect' },
    ],
  },
  {
    title: 'Student',
    fields: [
      { key: 'name', label: 'Full Name', required: true },
      { key: 'gender', label: 'Gender', type: 'genderSelect', required: true },
      { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'aadharNumber', label: 'Aadhar No.' },
      { key: 'photoUrl', label: 'Photo URL' },
      { key: 'photoKey', label: 'Photo Key' },
    ],
  },
  {
    title: 'Academic Placement',
    fields: [
      { key: 'courseId', label: 'Course', type: 'courseSelect' },
      { key: 'classId', label: 'Class', type: 'classSelect' },
      { key: 'sectionId', label: 'Section', type: 'sectionSelect' },
      { key: 'course', label: 'Course Text' },
      { key: 'className', label: 'Class Text' },
      { key: 'section', label: 'Section Text' },
      { key: 'rollNumber', label: 'Roll No.' },
    ],
  },
  {
    title: 'Parents and Guardian',
    fields: [
      { key: 'fatherName', label: 'Father Name' },
      { key: 'fatherMobile', label: 'Father Mobile', required: true },
      { key: 'motherName', label: 'Mother Name' },
      { key: 'motherMobile', label: 'Mother Mobile' },
      { key: 'guardianName', label: 'Guardian Name' },
      { key: 'guardianMobile', label: 'Guardian Mobile' },
      { key: 'guardianRelation', label: 'Guardian Relation' },
    ],
  },
  {
    title: 'Profile Details',
    fields: [
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'category', label: 'Category' },
      { key: 'religion', label: 'Religion' },
      { key: 'nationality', label: 'Nationality' },
    ],
  },
];

const studentFields = studentFieldGroups.flatMap((group) => group.fields.map((field) => field.key));

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function displayStatus(item) {
  if (item?.archived) return 'archived';
  return item?.status || 'active';
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (normalized === 'inactive') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'alumni') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (normalized === 'transferred') return 'border-violet-200 bg-violet-50 text-violet-700';
  if (normalized === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
}

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleDateString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
  return String(value);
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function getInitialStudentForm(defaultAcademicYear, record = {}) {
  const source = record || {};
  const next = {
    gender: 'Male',
    status: 'active',
    academicYear: defaultAcademicYear || '',
  };
  studentFields.forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) next[key] = source[key];
  });
  return next;
}

function normalizeStudentPayload(form, isCreate) {
  const payload = {};
  studentFields.forEach((key) => {
    const value = form[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    payload[key] = typeof value === 'string' ? value.trim() : value;
  });
  if (isCreate && !payload.status) payload.status = 'active';
  return payload;
}

function validateStudentPayload(payload, isCreate) {
  if (!isCreate) return '';
  const missing = ['name', 'gender', 'dob', 'academicYear', 'fatherMobile'].find((key) => !payload[key]);
  if (missing) {
    const label = studentFieldGroups.flatMap((group) => group.fields).find((field) => field.key === missing)?.label || missing;
    return `${label} is required.`;
  }
  if (!payload.classId && !payload.className && !payload.course) {
    return 'Class or course is required.';
  }
  return '';
}

function buildStudentQuery(filters) {
  return {
    q: filters.q,
    academicYear: filters.academicYear,
    courseId: filters.courseId,
    classId: filters.classId,
    sectionId: filters.sectionId,
    status: filters.status,
    gender: filters.gender,
    includeArchived: filters.includeArchived ? 'true' : '',
  };
}

function parseCsvRows(input) {
  const rows = [];
  let field = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => headers.reduce((record, header, index) => {
    if (header) record[header] = values[index]?.trim() || '';
    return record;
  }, {}));
}

function initialsFor(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';
}

function ModalFrame({ title, subtitle, children, footer, onClose, maxWidth = 'max-w-4xl' }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071e27]/50 p-4 backdrop-blur-sm">
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-white/35 bg-[#f3faff]/90 shadow-[0_30px_90px_rgba(7,30,39,.22)] backdrop-blur-2xl`}>
        <div className="flex items-start justify-between border-b border-white/35 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Students</p>
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

function StudentRecordModal({ academicData, defaultAcademicYear, initialRecord, onClose, onSave }) {
  const [form, setForm] = useState(() => getInitialStudentForm(defaultAcademicYear, initialRecord));
  const isEdit = Boolean(initialRecord?.id);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateCourse = (courseId) => {
    const course = academicData.courses.find((item) => item.id === courseId);
    setForm((current) => ({
      ...current,
      courseId,
      courseName: course?.name || '',
    }));
  };

  const updateClass = (classId) => {
    const klass = academicData.classes.find((item) => item.id === classId);
    setForm((current) => ({
      ...current,
      classId,
      className: klass?.name || current.className || '',
      courseId: klass?.courseId || current.courseId || '',
      courseName: klass?.courseName || current.courseName || '',
      academicYear: klass?.academicYear || current.academicYear || defaultAcademicYear || '',
    }));
  };

  const updateSection = (sectionId) => {
    const section = academicData.sections.find((item) => item.id === sectionId);
    setForm((current) => ({
      ...current,
      sectionId,
      section: section?.name || '',
      classId: section?.classId || current.classId || '',
      className: section?.className || current.className || '',
      academicYear: section?.academicYear || current.academicYear || defaultAcademicYear || '',
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = normalizeStudentPayload(form, !isEdit);
    const validation = validateStudentPayload(payload, !isEdit);
    if (validation) {
      toast.error(validation);
      return;
    }
    onSave(payload);
  };

  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  const renderField = (field) => {
    const value = form[field.key] ?? '';

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(event) => update(field.key, event.target.value)}
          className={`${inputClass} py-3`}
          rows={3}
        />
      );
    }

    if (field.type === 'academicYearSelect') {
      return (
        <select value={value} onChange={(event) => update(field.key, event.target.value)} className={inputClass}>
          <option value="">Select academic year</option>
          {academicData.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
          {value && !academicData.academicYears.some((year) => year.name === value) && <option value={value}>{value}</option>}
        </select>
      );
    }

    if (field.type === 'statusSelect') {
      return (
        <select value={value || 'active'} onChange={(event) => update(field.key, event.target.value)} className={inputClass}>
          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      );
    }

    if (field.type === 'genderSelect') {
      return (
        <select value={value || 'Male'} onChange={(event) => update(field.key, event.target.value)} className={inputClass}>
          {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
        </select>
      );
    }

    if (field.type === 'courseSelect') {
      return (
        <select value={value} onChange={(event) => updateCourse(event.target.value)} className={inputClass}>
          <option value="">Select course</option>
          {academicData.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
      );
    }

    if (field.type === 'classSelect') {
      return (
        <select value={value} onChange={(event) => updateClass(event.target.value)} className={inputClass}>
          <option value="">Select class</option>
          {academicData.classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
        </select>
      );
    }

    if (field.type === 'sectionSelect') {
      return (
        <select value={value} onChange={(event) => updateSection(event.target.value)} className={inputClass}>
          <option value="">Select section</option>
          {academicData.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
        </select>
      );
    }

    return (
      <input
        type={field.type || 'text'}
        value={value}
        onChange={(event) => update(field.key, event.target.value)}
        className={inputClass}
      />
    );
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Student' : 'Add Student'}
        subtitle={isEdit ? initialRecord?.admissionNumber : 'Create a backend student record.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="h-10 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              Save Student
            </button>
          </div>
        )}
      >
        <div className="max-h-[62vh] space-y-6 overflow-y-auto p-6">
          {studentFieldGroups.map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-sm font-bold text-[#003434]">{group.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <label key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">
                      {field.label}{field.required && !isEdit ? ' *' : ''}
                    </span>
                    {renderField(field)}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </ModalFrame>
    </form>
  );
}

function DocumentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState({ type: 'certificate', fileKey: '', fileName: '', fileSize: '', contentType: '' });
  const [file, setFile] = useState(null);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    onSave({ form, file });
  };

  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Add Document"
        subtitle={student?.name}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <Upload size={16} /> Attach
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Type *</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)} className={inputClass}>
              {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">File</span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] || null;
                setFile(nextFile);
                if (nextFile) {
                  setForm((current) => ({
                    ...current,
                    fileName: nextFile.name,
                    fileSize: String(nextFile.size),
                    contentType: nextFile.type,
                  }));
                }
              }}
              className={inputClass}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">File Key</span>
            <input value={form.fileKey} onChange={(event) => update('fileKey', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">File Name</span>
            <input value={form.fileName} onChange={(event) => update('fileName', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">File Size</span>
            <input value={form.fileSize} onChange={(event) => update('fileSize', event.target.value)} className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Content Type</span>
            <input value={form.contentType} onChange={(event) => update('contentType', event.target.value)} className={inputClass} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function ImportModal({ onClose, onImport }) {
  const [format, setFormat] = useState('json');
  const [text, setText] = useState('');

  const submit = (event) => {
    event.preventDefault();
    try {
      const rows = format === 'json' ? JSON.parse(text) : parseCsvRows(text);
      if (!Array.isArray(rows) || !rows.length) {
        toast.error('Import rows are required.');
        return;
      }
      onImport(rows);
    } catch {
      toast.error('Import data could not be parsed.');
    }
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Import Students"
        subtitle="Rows are sent to the backend import endpoint."
        onClose={onClose}
        maxWidth="max-w-3xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <Upload size={16} /> Import
            </button>
          </div>
        )}
      >
        <div className="space-y-4 p-6">
          <select value={format} onChange={(event) => setFormat(event.target.value)} className="h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
            <option value="json">JSON rows</option>
            <option value="csv">CSV rows</option>
          </select>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            className="w-full rounded-xl border border-white/40 bg-white/45 px-3 py-3 font-mono text-sm text-[#071e27] outline-none focus:border-[#006a62]"
            placeholder={format === 'json' ? '[{"name":"Aarav Singh","gender":"Male","dob":"2008-04-12","academicYear":"2026-2027","fatherMobile":"9999999999","className":"Class X"}]' : 'name,gender,dob,academicYear,fatherMobile,className'}
          />
        </div>
      </ModalFrame>
    </form>
  );
}

function MovementModal({ academicData, defaultAcademicYear, student, onClose, onSave }) {
  const [form, setForm] = useState({ mode: 'promotion', toClassId: '', toSectionId: '', toAcademicYear: defaultAcademicYear || student?.academicYear || '', reason: '' });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const klass = academicData.classes.find((item) => item.id === form.toClassId);
    const section = academicData.sections.find((item) => item.id === form.toSectionId);
    const payload = {
      toClassId: form.toClassId,
      toClassName: klass?.name || '',
      toSectionId: form.toSectionId || undefined,
      toSectionName: section?.name || '',
      toAcademicYear: form.toAcademicYear || undefined,
      reason: form.reason,
    };
    if (!payload.toClassId) {
      toast.error('Class is required.');
      return;
    }
    onSave(form.mode, payload);
  };

  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Promotion or Transfer"
        subtitle={student?.name}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <MoveRight size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[62vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Action</span>
            <select value={form.mode} onChange={(event) => update('mode', event.target.value)} className={inputClass}>
              <option value="promotion">Promotion</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
            <select value={form.toAcademicYear} onChange={(event) => update('toAcademicYear', event.target.value)} className={inputClass}>
              <option value="">Keep current</option>
              {academicData.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
              {form.toAcademicYear && !academicData.academicYears.some((year) => year.name === form.toAcademicYear) && <option value={form.toAcademicYear}>{form.toAcademicYear}</option>}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class *</span>
            <select value={form.toClassId} onChange={(event) => update('toClassId', event.target.value)} className={inputClass}>
              <option value="">Select class</option>
              {academicData.classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
            <select value={form.toSectionId} onChange={(event) => update('toSectionId', event.target.value)} className={inputClass}>
              <option value="">No section</option>
              {academicData.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Reason</span>
            <textarea value={form.reason} onChange={(event) => update('reason', event.target.value)} className={`${inputClass} py-3`} rows={3} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg bg-white/45 p-3">
      <p className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#071e27]">{valueOrDash(value)}</p>
    </div>
  );
}

export default function StudentsManagement({ currentUser, academicYear = '' }) {
  const [academicData, setAcademicData] = useState({ academicYears: [], courses: [], classes: [], sections: [] });
  const [filters, setFilters] = useState({
    q: '',
    academicYear: academicYear || '',
    courseId: '',
    classId: '',
    sectionId: '',
    status: '',
    gender: '',
    includeArchived: false,
  });
  const [students, setStudents] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [drawerTab, setDrawerTab] = useState('profile');
  const [documents, setDocuments] = useState([]);
  const [placementHistory, setPlacementHistory] = useState([]);
  const [idCardData, setIdCardData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [studentModalRecord, setStudentModalRecord] = useState(undefined);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const canCreate = hasPermission(currentUser, 'students.create');
  const canEdit = hasPermission(currentUser, 'students.edit');
  const canArchive = hasPermission(currentUser, 'students.archive');
  const canExport = hasPermission(currentUser, 'students.export');
  const canImport = hasPermission(currentUser, 'students.import');
  const canPromote = hasPermission(currentUser, 'students.promote');
  const canIdCard = hasPermission(currentUser, 'students.idcard');

  useEffect(() => {
    let active = true;
    if (!filters.academicYear && academicYear) {
      Promise.resolve().then(() => {
        if (active) setFilters((current) => ({ ...current, academicYear }));
      });
    }
    return () => {
      active = false;
    };
  }, [academicYear, filters.academicYear]);

  const loadAcademicData = useCallback(async () => {
    try {
      const [academicYears, courses, classes, sections] = await Promise.all([
        listAcademicResource('academicYears'),
        listAcademicResource('courses'),
        listAcademicResource('classes'),
        listAcademicResource('sections'),
      ]);
      setAcademicData({ academicYears, courses, classes, sections });
    } catch (error) {
      console.error('Unable to load academic lookup data.', error);
      toast.error(error?.message || 'Academic lookup data could not be loaded.');
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStudents(buildStudentQuery(filters));
      setStudents(data.students);
      setCount(data.count);
      setLoadError('');
      setSelectedStudent((current) => {
        if (!current) return current;
        return data.students.find((student) => student.id === current.id) || current;
      });
    } catch (error) {
      console.error('Unable to load backend student records.', error);
      setLoadError(error?.message || 'Unable to load students from the backend.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadAcademicData();
    });
    return () => {
      active = false;
    };
  }, [loadAcademicData]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadStudents();
    });
    return () => {
      active = false;
    };
  }, [loadStudents]);

  const defaultAcademicYear = filters.academicYear || academicYear || academicData.academicYears[0]?.name || '';

  const summary = useMemo(() => students.reduce((total, student) => {
    const status = displayStatus(student);
    return {
      all: total.all + 1,
      active: total.active + (status === 'active' ? 1 : 0),
      archived: total.archived + (status === 'archived' ? 1 : 0),
      transferred: total.transferred + (status === 'transferred' ? 1 : 0),
    };
  }, { all: 0, active: 0, archived: 0, transferred: 0 }), [students]);

  const updateFilter = (key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === 'courseId') {
        next.classId = '';
        next.sectionId = '';
      }
      if (key === 'classId') {
        next.sectionId = '';
      }
      return next;
    });
  };

  const filteredClasses = useMemo(() => (
    filters.courseId ? academicData.classes.filter((item) => item.courseId === filters.courseId) : academicData.classes
  ), [academicData.classes, filters.courseId]);

  const filteredSections = useMemo(() => (
    filters.classId ? academicData.sections.filter((item) => item.classId === filters.classId) : academicData.sections
  ), [academicData.sections, filters.classId]);

  const openStudent = async (student) => {
    setSelectedStudent(student);
    setDrawerTab('profile');
    setDrawerLoading(true);
    setIdCardData(null);
    try {
      const [record, nextDocuments, history] = await Promise.all([
        getStudent(student.id).catch(() => student),
        listStudentDocuments(student.id).catch(() => []),
        listPlacementHistory(student.id).catch(() => []),
      ]);
      setSelectedStudent(record || student);
      setDocuments(nextDocuments);
      setPlacementHistory(history);
    } catch (error) {
      toast.error(error?.message || 'Student details could not be loaded.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedStudent(null);
    setDocuments([]);
    setPlacementHistory([]);
    setIdCardData(null);
  };

  const reloadSelectedContext = async (student = selectedStudent) => {
    if (!student?.id) return;
    const [record, nextDocuments, history] = await Promise.all([
      getStudent(student.id).catch(() => student),
      listStudentDocuments(student.id).catch(() => []),
      listPlacementHistory(student.id).catch(() => []),
    ]);
    setSelectedStudent(record || student);
    setDocuments(nextDocuments);
    setPlacementHistory(history);
  };

  const saveStudentRecord = async (payload) => {
    const isEdit = Boolean(studentModalRecord?.id);
    if (isEdit && !canEdit) {
      toast.error('You do not have permission to edit students.');
      return;
    }
    if (!isEdit && !canCreate) {
      toast.error('You do not have permission to create students.');
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit ? await updateStudent(studentModalRecord.id, payload) : await createStudent(payload);
      setStudents((current) => (
        isEdit
          ? current.map((student) => (student.id === saved.id ? saved : student))
          : [saved, ...current]
      ));
      setSelectedStudent((current) => (current?.id === saved.id ? saved : current));
      setStudentModalRecord(undefined);
      toast.success('Student saved');
      await loadStudents();
    } catch (error) {
      toast.error(error?.message || 'Student was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const archiveOrRestore = async (student) => {
    if (!canArchive) {
      toast.error('You do not have permission to archive students.');
      return;
    }
    try {
      const saved = student.archived ? await restoreStudent(student.id) : await archiveStudent(student.id);
      setStudents((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSelectedStudent((current) => (current?.id === saved.id ? saved : current));
      toast.success(student.archived ? 'Student restored' : 'Student archived');
      await loadStudents();
    } catch (error) {
      toast.error(error?.message || 'Student archive status was not updated.');
    }
  };

  const handleExport = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export students.');
      return;
    }
    try {
      const { blob, filename } = await exportStudents(buildStudentQuery(filters));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Students exported');
    } catch (error) {
      toast.error(error?.message || 'Students could not be exported.');
    }
  };

  const handleImport = async (rows) => {
    if (!canImport) {
      toast.error('You do not have permission to import students.');
      return;
    }
    setSaving(true);
    try {
      const result = await bulkImportStudents(rows);
      setImportModalOpen(false);
      toast.success(`Import complete: ${result.created || 0} created, ${result.failed || 0} failed`);
      await loadStudents();
    } catch (error) {
      toast.error(error?.message || 'Students could not be imported.');
    } finally {
      setSaving(false);
    }
  };

  const saveDocument = async ({ form, file }) => {
    if (!selectedStudent?.id || !canEdit) {
      toast.error('You do not have permission to edit student documents.');
      return;
    }

    setSaving(true);
    try {
      let payload = {
        type: form.type,
        fileKey: form.fileKey?.trim(),
        fileName: form.fileName?.trim() || null,
        fileSize: form.fileSize ? Number(form.fileSize) || form.fileSize : null,
        contentType: form.contentType?.trim() || null,
      };

      if (file) {
        const upload = await presignUpload({
          folder: 'student-documents',
          ownerId: selectedStudent.id,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        });
        await uploadPresignedFile({
          uploadUrl: upload.uploadUrl,
          method: upload.method,
          headers: upload.headers,
          file,
        });
        payload = {
          ...payload,
          fileKey: upload.key,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
        };
      }

      if (!payload.type || !payload.fileKey) {
        toast.error('Document type and file key are required.');
        return;
      }

      await addStudentDocument(selectedStudent.id, payload);
      setDocumentModalOpen(false);
      toast.success('Document attached');
      await reloadSelectedContext();
    } catch (error) {
      toast.error(error?.message || 'Document was not attached.');
    } finally {
      setSaving(false);
    }
  };

  const setDocumentStatus = async (document, nextStatus) => {
    if (!selectedStudent?.id || !canEdit) {
      toast.error('You do not have permission to edit student documents.');
      return;
    }
    const remarks = window.prompt('Remarks', document.remarks || '');
    if (remarks === null) return;
    try {
      const saved = nextStatus === 'verified'
        ? await verifyStudentDocument(selectedStudent.id, document.id, remarks)
        : await rejectStudentDocument(selectedStudent.id, document.id, remarks);
      setDocuments((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success(nextStatus === 'verified' ? 'Document verified' : 'Document rejected');
    } catch (error) {
      toast.error(error?.message || 'Document status was not updated.');
    }
  };

  const saveMovement = async (mode, payload) => {
    if (!selectedStudent?.id || !canPromote) {
      toast.error('You do not have permission to promote or transfer students.');
      return;
    }
    setSaving(true);
    try {
      const saved = mode === 'promotion'
        ? await promoteStudent(selectedStudent.id, payload)
        : await transferStudent(selectedStudent.id, payload);
      setMovementModalOpen(false);
      setStudents((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSelectedStudent(saved);
      toast.success(mode === 'promotion' ? 'Student promoted' : 'Student transferred');
      await Promise.all([loadStudents(), reloadSelectedContext(saved)]);
    } catch (error) {
      toast.error(error?.message || 'Student movement was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const loadIdCard = async () => {
    if (!selectedStudent?.id || !canIdCard) return;
    setDrawerLoading(true);
    try {
      setIdCardData(await getStudentIdCard(selectedStudent.id));
    } catch (error) {
      toast.error(error?.message || 'ID card data could not be loaded.');
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (drawerTab === 'id-card' && selectedStudent?.id && canIdCard && !idCardData) {
      Promise.resolve().then(() => {
        if (active) loadIdCard();
      });
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTab, selectedStudent?.id, canIdCard]);

  const drawerTabs = [
    { id: 'profile', label: 'Profile', icon: UserRound },
    { id: 'documents', label: 'Documents', icon: FileText, value: documents.length },
    { id: 'placement', label: 'Placement', icon: GraduationCap, value: placementHistory.length },
    { id: 'id-card', label: 'ID Card', icon: IdCard },
  ];

  return (
    <div className="erp-students-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-[#3f4848]">
            <span>Management</span>
            <span>/</span>
            <span className="text-[#006a62]">Students</span>
          </div>
          <h1 className="font-['Montserrat'] text-3xl font-bold text-[#003434]">Students</h1>
          <p className="mt-2 text-sm text-[#3f4848]">Backend-backed student lifecycle records.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          {canImport && (
            <button type="button" onClick={() => setImportModalOpen(true)} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/35 px-4 text-sm font-bold text-[#004d4d] hover:bg-white/55 disabled:opacity-50">
              <Upload size={17} /> Import
            </button>
          )}
          {canExport && (
            <button type="button" onClick={handleExport} disabled={saving || loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/35 px-4 text-sm font-bold text-[#004d4d] hover:bg-white/55 disabled:opacity-50">
              <Download size={17} /> Export
            </button>
          )}
          {canCreate && (
            <button type="button" onClick={() => setStudentModalRecord(null)} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
              <Plus size={17} /> Add Student
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-12 space-y-5 xl:col-span-3">
          <section className="erp-glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#3f4848]">Current Filter</span>
              <CalendarDays size={20} className="text-[#006a62]" />
            </div>
            <h2 className="mt-4 font-['Montserrat'] text-2xl font-bold text-[#003434]">{defaultAcademicYear || '-'}</h2>
            <p className="mt-1 text-sm text-[#3f4848]">{count} backend record{count === 1 ? '' : 's'} matched.</p>
          </section>

          <section className="erp-glass-card rounded-2xl p-5">
            <p className="mb-4 text-[11px] font-bold uppercase text-[#3f4848]">Loaded Records</p>
            <div className="space-y-3">
              {[
                ['Total', summary.all],
                ['Active', summary.active],
                ['Archived', summary.archived],
                ['Transferred', summary.transferred],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#3f4848]">{label}</span>
                    <b className="text-[#003434]">{loading ? '-' : value}</b>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/35">
                    <div className="h-full rounded-full bg-[#004d4d]" style={{ width: `${Math.min(100, Math.max(8, Number(value || 0) * 10))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="col-span-12 space-y-5 xl:col-span-9">
          <div className="erp-glass-card rounded-2xl p-5">
            <div className="grid gap-4 lg:grid-cols-12">
              <label className="lg:col-span-4">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Search</span>
                <span className="relative block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={17} />
                  <input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 pl-10 pr-4 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20" placeholder="Name, admission no, roll no" />
                </span>
              </label>
              <label className="lg:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
                <select value={filters.academicYear} onChange={(event) => updateFilter('academicYear', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All years</option>
                  {academicData.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
                  {filters.academicYear && !academicData.academicYears.some((year) => year.name === filters.academicYear) && <option value={filters.academicYear}>{filters.academicYear}</option>}
                </select>
              </label>
              <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Course</span>
                <select value={filters.courseId} onChange={(event) => updateFilter('courseId', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All courses</option>
                  {academicData.courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
              </label>
              <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
                <select value={filters.classId} onChange={(event) => updateFilter('classId', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All classes</option>
                  {filteredClasses.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
                </select>
              </label>
              <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
                <select value={filters.sectionId} onChange={(event) => updateFilter('sectionId', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All sections</option>
                  {filteredSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                </select>
              </label>
              <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
                <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All statuses</option>
                  {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="lg:col-span-3">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Gender</span>
                <select value={filters.gender} onChange={(event) => updateFilter('gender', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
                  <option value="">All genders</option>
                  {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                </select>
              </label>
              <div className="flex items-end gap-3 lg:col-span-3">
                <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-white/40 bg-white/35 px-3 text-xs font-semibold text-[#3f4848]">
                  <input type="checkbox" checked={filters.includeArchived} onChange={(event) => updateFilter('includeArchived', event.target.checked)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
                  Include archived
                </label>
                <button type="button" onClick={loadStudents} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#004d4d] text-white" aria-label="Refresh students">
                  <RefreshCcw size={17} />
                </button>
              </div>
            </div>
          </div>

          <div className="erp-glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="bg-[#004d4d] text-white">
                    <th className="px-5 py-4 text-[11px] font-bold uppercase">Student Info</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase">Admission</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase">Course and Class</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase">Guardian</th>
                    <th className="px-5 py-4 text-[11px] font-bold uppercase">Status</th>
                    <th className="px-5 py-4 text-right text-[11px] font-bold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/25">
                  {loading && (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-[#3f4848]">
                        <span className="inline-flex items-center gap-2 font-semibold"><Loader2 className="animate-spin" size={16} /> Loading students...</span>
                      </td>
                    </tr>
                  )}
                  {!loading && students.map((student) => (
                    <tr key={student.id} onClick={() => openStudent(student)} className="cursor-pointer transition hover:bg-white/25">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt="" className="h-11 w-11 rounded-lg object-cover shadow-sm" />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#004d4d] text-sm font-bold text-white shadow-sm">
                              {initialsFor(student.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#071e27]">{student.name || '-'}</p>
                            <p className="text-xs text-[#3f4848]">{student.rollNumber ? `Roll ${student.rollNumber}` : student.email || student.mobile || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#3f4848]">
                        <b className="block text-[#071e27]">{student.admissionNumber || '-'}</b>
                        <span className="text-xs">{formatDate(student.admissionDate)}</span>
                      </td>
                      <td className="px-5 py-4 text-[#3f4848]">
                        <b className="block text-[#071e27]">{student.courseName || student.course || '-'}</b>
                        <span className="text-xs">{[student.className, student.section].filter(Boolean).join(' / ') || '-'}</span>
                      </td>
                      <td className="px-5 py-4 text-[#3f4848]">
                        <b className="block text-[#071e27]">{student.fatherName || student.guardianName || '-'}</b>
                        <span className="text-xs">{student.fatherMobile || student.guardianMobile || '-'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${statusClasses(displayStatus(student))}`}>
                          {displayStatus(student)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={(event) => { event.stopPropagation(); openStudent(student); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/40 text-[#004d4d] hover:bg-white" title="View">
                            <Eye size={16} />
                          </button>
                          {canEdit && (
                            <button type="button" onClick={(event) => { event.stopPropagation(); setStudentModalRecord(student); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/40 text-[#004d4d] hover:bg-white" title="Edit">
                              <Edit3 size={16} />
                            </button>
                          )}
                          {canArchive && (
                            <button type="button" onClick={(event) => { event.stopPropagation(); archiveOrRestore(student); }} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/40 text-[#004d4d] hover:bg-white" title={student.archived ? 'Restore' : 'Archive'}>
                              {student.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !students.length && (
                    <tr>
                      <td colSpan="6" className="px-5 py-14 text-center text-[#3f4848]">
                        <Users className="mx-auto mb-3 text-[#006a62]" size={34} />
                        <p className="font-bold text-[#003434]">No students found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {selectedStudent && (
        <>
          <button type="button" aria-label="Close profile" onClick={closeDrawer} className="fixed inset-0 z-[70] bg-[#071e27]/30 backdrop-blur-sm" />
          <aside className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-xl flex-col overflow-hidden bg-[#f3faff] shadow-2xl">
            <div className="flex items-center justify-between bg-[#004d4d] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <button type="button" onClick={closeDrawer} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close profile">
                  <X size={17} />
                </button>
                <div>
                  <p className="text-xs font-semibold text-white/70">Profile Preview</p>
                  <h2 className="text-lg font-bold text-white">{selectedStudent.name || 'Student'}</h2>
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button type="button" onClick={() => setStudentModalRecord(selectedStudent)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" title="Edit">
                    <Edit3 size={16} />
                  </button>
                )}
                {canIdCard && (
                  <a href={studentIdCardPdfUrl(selectedStudent.id)} target="_blank" rel="noreferrer" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" title="ID card PDF">
                    <FileDown size={16} />
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="border-b border-[#cfe6f2] bg-white/45 p-6 text-center">
                {selectedStudent.photoUrl ? (
                  <img src={selectedStudent.photoUrl} alt="" className="mx-auto h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-lg" />
                ) : (
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-[#004d4d] text-2xl font-bold text-white shadow-lg">
                    {initialsFor(selectedStudent.name)}
                  </div>
                )}
                <h3 className="mt-4 font-['Montserrat'] text-2xl font-bold text-[#003434]">{selectedStudent.name || '-'}</h3>
                <p className="text-sm font-semibold text-[#3f4848]">{selectedStudent.admissionNumber || selectedStudent.id}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${statusClasses(displayStatus(selectedStudent))}`}>
                    {displayStatus(selectedStudent)}
                  </span>
                  <span className="inline-flex rounded-full border border-[#81f3e5]/60 bg-[#81f3e5]/35 px-3 py-1 text-[11px] font-bold uppercase text-[#006f66]">
                    {selectedStudent.academicYear || '-'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto border-b border-[#cfe6f2] bg-white/25 px-4">
                {drawerTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = drawerTab === tab.id;
                  return (
                    <button key={tab.id} type="button" onClick={() => setDrawerTab(tab.id)} className={`flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-bold whitespace-nowrap ${active ? 'border-[#004d4d] text-[#004d4d]' : 'border-transparent text-[#3f4848]'}`}>
                      <Icon size={15} /> {tab.label}{tab.value !== undefined ? ` (${tab.value})` : ''}
                    </button>
                  );
                })}
              </div>

              {drawerLoading && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm font-semibold text-[#3f4848]">
                  <Loader2 className="animate-spin" size={16} /> Loading details...
                </div>
              )}

              {drawerTab === 'profile' && (
                <div className="space-y-6 p-6">
                  <section>
                    <h4 className="mb-3 text-sm font-bold text-[#003434]">Academic Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailRow label="Admission Date" value={formatDate(selectedStudent.admissionDate)} />
                      <DetailRow label="Roll No." value={selectedStudent.rollNumber} />
                      <DetailRow label="Course" value={selectedStudent.courseName || selectedStudent.course} />
                      <DetailRow label="Class" value={[selectedStudent.className, selectedStudent.section].filter(Boolean).join(' / ')} />
                    </div>
                  </section>
                  <section>
                    <h4 className="mb-3 text-sm font-bold text-[#003434]">Personal Details</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailRow label="Gender" value={selectedStudent.gender} />
                      <DetailRow label="DOB" value={formatDate(selectedStudent.dob)} />
                      <DetailRow label="Blood Group" value={selectedStudent.bloodGroup} />
                      <DetailRow label="Mobile" value={selectedStudent.mobile} />
                      <DetailRow label="Email" value={selectedStudent.email} />
                      <DetailRow label="Aadhar" value={selectedStudent.aadharNumber} />
                      <DetailRow label="Category" value={selectedStudent.category} />
                      <DetailRow label="Nationality" value={selectedStudent.nationality} />
                      <div className="col-span-2">
                        <DetailRow label="Address" value={selectedStudent.address} />
                      </div>
                    </div>
                  </section>
                  <section>
                    <h4 className="mb-3 text-sm font-bold text-[#003434]">Parents and Guardian</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailRow label="Father" value={selectedStudent.fatherName} />
                      <DetailRow label="Father Mobile" value={selectedStudent.fatherMobile} />
                      <DetailRow label="Mother" value={selectedStudent.motherName} />
                      <DetailRow label="Mother Mobile" value={selectedStudent.motherMobile} />
                      <DetailRow label="Guardian" value={selectedStudent.guardianName} />
                      <DetailRow label="Guardian Mobile" value={selectedStudent.guardianMobile} />
                      <DetailRow label="Relation" value={selectedStudent.guardianRelation} />
                      <DetailRow label="Religion" value={selectedStudent.religion} />
                    </div>
                  </section>
                </div>
              )}

              {drawerTab === 'documents' && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-[#003434]">Documents</h4>
                    {canEdit && (
                      <button type="button" onClick={() => setDocumentModalOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                  {documents.map((document) => (
                    <div key={document.id} className="rounded-xl border border-[#cfe6f2] bg-white/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#071e27]">{document.type || 'document'}</p>
                          <p className="mt-1 break-all text-xs text-[#3f4848]">{document.fileName || document.fileKey || '-'}</p>
                          {document.remarks && <p className="mt-2 text-xs text-[#3f4848]">{document.remarks}</p>}
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${statusClasses(document.status)}`}>
                          {document.status || 'pending'}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {document.url && (
                          <a href={document.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/65 px-3 text-xs font-bold text-[#004d4d]">
                            <Eye size={14} /> Open
                          </a>
                        )}
                        {canEdit && (
                          <>
                            <button type="button" onClick={() => setDocumentStatus(document, 'verified')} className="inline-flex h-8 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                              <ShieldCheck size={14} /> Verify
                            </button>
                            <button type="button" onClick={() => setDocumentStatus(document, 'rejected')} className="inline-flex h-8 items-center gap-2 rounded-lg bg-rose-50 px-3 text-xs font-bold text-rose-700">
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {!documents.length && <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">No documents found.</div>}
                </div>
              )}

              {drawerTab === 'placement' && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-[#003434]">Placement History</h4>
                    {canPromote && (
                      <button type="button" onClick={() => setMovementModalOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
                        <MoveRight size={14} /> Move
                      </button>
                    )}
                  </div>
                  {placementHistory.map((record) => (
                    <div key={record.id} className="rounded-xl border border-[#cfe6f2] bg-white/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold capitalize text-[#071e27]">{record.type || 'movement'}</p>
                          <p className="mt-1 text-xs text-[#3f4848]">{formatDate(record.at)}</p>
                        </div>
                        <span className="rounded-full border border-[#81f3e5]/60 bg-[#81f3e5]/35 px-3 py-1 text-[11px] font-bold uppercase text-[#006f66]">
                          {record.toAcademicYear || record.fromAcademicYear || selectedStudent.academicYear || '-'}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <DetailRow label="From" value={record.fromClassName || record.fromClassId} />
                        <DetailRow label="To" value={record.toClassName || record.toClassId} />
                        <DetailRow label="Section" value={record.toSectionName || record.toSectionId} />
                        <DetailRow label="Reason" value={record.reason} />
                      </div>
                    </div>
                  ))}
                  {!placementHistory.length && <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">No placement history found.</div>}
                </div>
              )}

              {drawerTab === 'id-card' && (
                <div className="space-y-4 p-6">
                  {!canIdCard && <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">ID card permission is required.</div>}
                  {canIdCard && (
                    <>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={loadIdCard} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white/60 px-3 text-xs font-bold text-[#004d4d]">
                          <RefreshCcw size={14} /> Refresh
                        </button>
                        <a href={studentIdCardPdfUrl(selectedStudent.id)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
                          <FileDown size={14} /> PDF
                        </a>
                      </div>
                      <div className="rounded-2xl border border-[#cfe6f2] bg-white p-5 shadow-lg">
                        <div className="flex items-center gap-4 border-b border-[#cfe6f2] pb-4">
                          {idCardData?.photoUrl ? (
                            <img src={idCardData.photoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#004d4d] text-xl font-bold text-white">
                              {initialsFor(idCardData?.name || selectedStudent.name)}
                            </div>
                          )}
                          <div>
                            <p className="text-[11px] font-bold uppercase text-[#006a62]">Student ID Card</p>
                            <h4 className="mt-1 text-xl font-bold text-[#003434]">{idCardData?.name || selectedStudent.name || '-'}</h4>
                            <p className="text-sm text-[#3f4848]">{idCardData?.admissionNumber || selectedStudent.admissionNumber || '-'}</p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <DetailRow label="Class" value={idCardData?.className} />
                          <DetailRow label="Section" value={idCardData?.section} />
                          <DetailRow label="Roll No." value={idCardData?.rollNumber} />
                          <DetailRow label="Academic Year" value={idCardData?.academicYear} />
                          <DetailRow label="Blood Group" value={idCardData?.bloodGroup} />
                          <DetailRow label="Father" value={idCardData?.fatherName} />
                          <DetailRow label="Guardian Mobile" value={idCardData?.guardianMobile} />
                          <DetailRow label="Address" value={idCardData?.address} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-[#cfe6f2] bg-white/55 p-5">
              {canEdit && (
                <button type="button" onClick={() => setStudentModalRecord(selectedStudent)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
                  <Edit3 size={16} /> Edit
                </button>
              )}
              {canPromote && (
                <button type="button" onClick={() => setMovementModalOpen(true)} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-white px-4 text-sm font-bold text-[#004d4d]">
                  <MoveRight size={16} /> Move
                </button>
              )}
              {canArchive && (
                <button type="button" onClick={() => archiveOrRestore(selectedStudent)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-white px-4 text-sm font-bold text-[#004d4d]">
                  {selectedStudent.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {studentModalRecord !== undefined && (
        <StudentRecordModal
          academicData={academicData}
          defaultAcademicYear={defaultAcademicYear}
          initialRecord={studentModalRecord}
          onClose={() => setStudentModalRecord(undefined)}
          onSave={saveStudentRecord}
        />
      )}

      {documentModalOpen && (
        <DocumentModal
          student={selectedStudent}
          onClose={() => setDocumentModalOpen(false)}
          onSave={saveDocument}
        />
      )}

      {movementModalOpen && (
        <MovementModal
          academicData={academicData}
          defaultAcademicYear={defaultAcademicYear}
          student={selectedStudent}
          onClose={() => setMovementModalOpen(false)}
          onSave={saveMovement}
        />
      )}

      {importModalOpen && (
        <ImportModal
          onClose={() => setImportModalOpen(false)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}
