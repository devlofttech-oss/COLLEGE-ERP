import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  BadgeCheck,
  CheckCheck,
  CircleDot,
  ClipboardCheck,
  Edit3,
  Eye,
  GraduationCap,
  Loader2,
  MessageSquarePlus,
  MoveRight,
  Plus,
  RefreshCcw,
  Search,
  Send,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import {
  addAdmissionFollowup,
  approveAdmission,
  archiveAdmission,
  convertAdmissionToStudent,
  createAdmission,
  getAdmission,
  listAdmissionFollowups,
  listAdmissions,
  moveAdmissionToApplication,
  rejectAdmission,
  restoreAdmission,
  updateAdmission,
} from '../../api/admissions';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const STAGES = ['enquiry', 'application', 'approved', 'rejected', 'converted'];
const STATUSES = ['New', 'Follow-up', 'Applied', 'Approved', 'Rejected', 'Converted'];
const GENDERS = ['Male', 'Female', 'Other'];

const stageColumns = [
  { id: 'enquiry', label: 'Enquiry', color: '#60a5fa', icon: CircleDot },
  { id: 'application', label: 'Application', color: '#f59e0b', icon: ClipboardCheck },
  { id: 'approved', label: 'Approved', color: '#10b981', icon: BadgeCheck },
  { id: 'rejected', label: 'Rejected', color: '#f43f5e', icon: XCircle },
  { id: 'converted', label: 'Converted', color: '#006a62', icon: CheckCheck },
];

const sourceOptions = ['Walk-in', 'Website', 'Phone', 'Referral', 'Campaign', 'Agent', 'Other'];

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || permissions.includes(permission);
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'converted') return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
  if (normalized === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'applied') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === 'follow-up') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-white/50 bg-white/50 text-[#004d4d]';
}

function displayStage(record) {
  if (record?.archived) return 'archived';
  return record?.stage || 'enquiry';
}

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return String(value);
}

function formatDocuments(value) {
  if (!value) return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return Object.values(value).filter(Boolean).join(', ') || '-';
  return String(value);
}

function initialsFor(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AD';
}

function valueOrDash(value) {
  return value === undefined || value === null || value === '' ? '-' : value;
}

function buildAdmissionQuery(filters) {
  return {
    stage: filters.stage,
    status: filters.status,
    source: filters.source,
    courseInterested: filters.courseInterested,
    academicYear: filters.academicYear,
    includeArchived: filters.includeArchived ? 'true' : '',
  };
}

function normalizeAdmissionPayload(form, isCreate) {
  const payload = {};
  [
    'studentName',
    'parentName',
    'phone',
    'email',
    'courseInterested',
    'source',
    'followUpDate',
    'status',
    'stage',
    'remarks',
    'dob',
    'gender',
    'address',
    'classInterested',
    'academicYear',
  ].forEach((key) => {
    const value = form[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    payload[key] = typeof value === 'string' ? value.trim() : value;
  });

  const documents = String(form.documents || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (documents.length) payload.documents = documents;

  if (isCreate) {
    delete payload.stage;
    delete payload.status;
  }
  return payload;
}

function validateAdmissionPayload(payload, isCreate) {
  if (!isCreate) return '';
  const missing = [
    ['studentName', 'Student name'],
    ['parentName', 'Parent name'],
    ['phone', 'Phone'],
    ['courseInterested', 'Course interested'],
  ].find(([key]) => !payload[key]);
  return missing ? `${missing[1]} is required.` : '';
}

function ModalFrame({ title, subtitle, children, footer, onClose, maxWidth = 'max-w-4xl' }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071e27]/50 p-4 backdrop-blur-sm">
      <div className={`max-h-[92vh] w-full ${maxWidth} overflow-hidden rounded-2xl border border-white/35 bg-[#f3faff]/90 shadow-[0_30px_90px_rgba(7,30,39,.22)] backdrop-blur-2xl`}>
        <div className="flex items-start justify-between border-b border-white/35 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Admissions</p>
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

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg bg-white/45 p-3">
      <p className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#071e27]">{valueOrDash(value)}</p>
    </div>
  );
}

function AdmissionModal({ academicData, defaultAcademicYear, initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    studentName: initialRecord?.studentName || '',
    parentName: initialRecord?.parentName || '',
    phone: initialRecord?.phone || '',
    email: initialRecord?.email || '',
    courseInterested: initialRecord?.courseInterested || '',
    source: initialRecord?.source || '',
    followUpDate: initialRecord?.followUpDate || '',
    status: initialRecord?.status || 'New',
    stage: initialRecord?.stage || 'enquiry',
    remarks: initialRecord?.remarks || '',
    documents: Array.isArray(initialRecord?.documents) ? initialRecord.documents.join(', ') : initialRecord?.documents || '',
    dob: initialRecord?.dob || '',
    gender: initialRecord?.gender || 'Other',
    address: initialRecord?.address || '',
    classInterested: initialRecord?.classInterested || '',
    academicYear: initialRecord?.academicYear || defaultAcademicYear || '',
  }));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const payload = normalizeAdmissionPayload(form, !isEdit);
    const validation = validateAdmissionPayload(payload, !isEdit);
    if (validation) {
      toast.error(validation);
      return;
    }
    onSave(payload);
  };

  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Admission' : 'Add Enquiry'}
        subtitle={isEdit ? initialRecord?.enquiryNumber : 'Creates a backend enquiry record.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <Send size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="max-h-[62vh] space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="mb-3 text-sm font-bold text-[#003434]">Applicant</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Student Name{!isEdit ? ' *' : ''}</span>
                <input value={form.studentName} onChange={(event) => update('studentName', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Parent Name{!isEdit ? ' *' : ''}</span>
                <input value={form.parentName} onChange={(event) => update('parentName', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Phone{!isEdit ? ' *' : ''}</span>
                <input value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Email</span>
                <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">DOB</span>
                <input type="date" value={form.dob} onChange={(event) => update('dob', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Gender</span>
                <select value={form.gender} onChange={(event) => update('gender', event.target.value)} className={inputClass}>
                  {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-[#003434]">Interest</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
                <select value={form.academicYear} onChange={(event) => update('academicYear', event.target.value)} className={inputClass}>
                  <option value="">Select academic year</option>
                  {academicData.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
                  {form.academicYear && !academicData.academicYears.some((year) => year.name === form.academicYear) && <option value={form.academicYear}>{form.academicYear}</option>}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Course Interested{!isEdit ? ' *' : ''}</span>
                <select value={form.courseInterested} onChange={(event) => update('courseInterested', event.target.value)} className={inputClass}>
                  <option value="">Select course</option>
                  {academicData.courses.map((course) => <option key={course.id} value={course.name}>{course.name}</option>)}
                  {form.courseInterested && !academicData.courses.some((course) => course.name === form.courseInterested) && <option value={form.courseInterested}>{form.courseInterested}</option>}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class Interested</span>
                <select value={form.classInterested} onChange={(event) => update('classInterested', event.target.value)} className={inputClass}>
                  <option value="">Select class</option>
                  {academicData.classes.map((klass) => <option key={klass.id} value={klass.name}>{klass.name}</option>)}
                  {form.classInterested && !academicData.classes.some((klass) => klass.name === form.classInterested) && <option value={form.classInterested}>{form.classInterested}</option>}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Source</span>
                <select value={form.source} onChange={(event) => update('source', event.target.value)} className={inputClass}>
                  <option value="">Select source</option>
                  {sourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
                  {form.source && !sourceOptions.includes(form.source) && <option value={form.source}>{form.source}</option>}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Follow-up Date</span>
                <input type="date" value={form.followUpDate} onChange={(event) => update('followUpDate', event.target.value)} className={inputClass} />
              </label>
              {isEdit && (
                <>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Stage</span>
                    <select value={form.stage} onChange={(event) => update('stage', event.target.value)} className={inputClass}>
                      {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
                    <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                </>
              )}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Documents</span>
                <input value={form.documents} onChange={(event) => update('documents', event.target.value)} className={inputClass} placeholder="Comma separated document names" />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Remarks</span>
                <textarea value={form.remarks} onChange={(event) => update('remarks', event.target.value)} className={`${inputClass} py-3`} rows={3} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Address</span>
                <textarea value={form.address} onChange={(event) => update('address', event.target.value)} className={`${inputClass} py-3`} rows={3} />
              </label>
            </div>
          </section>
        </div>
      </ModalFrame>
    </form>
  );
}

function FollowupModal({ admission, onClose, onSave }) {
  const [form, setForm] = useState({ note: '', nextFollowUpDate: admission?.followUpDate || '', outcome: '' });
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  const submit = (event) => {
    event.preventDefault();
    if (!form.note.trim()) {
      toast.error('Follow-up note is required.');
      return;
    }
    onSave({
      note: form.note.trim(),
      nextFollowUpDate: form.nextFollowUpDate || null,
      outcome: form.outcome.trim() || null,
    });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Add Follow-up"
        subtitle={admission?.studentName}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <MessageSquarePlus size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Note *</span>
            <textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} className={`${inputClass} py-3`} rows={4} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Next Follow-up Date</span>
            <input type="date" value={form.nextFollowUpDate || ''} onChange={(event) => setForm((current) => ({ ...current, nextFollowUpDate: event.target.value }))} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Outcome</span>
            <input value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value }))} className={inputClass} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function DecisionModal({ admission, mode, onClose, onSave }) {
  const [form, setForm] = useState({ admissionNumber: admission?.admissionNumber || '', academicYear: admission?.academicYear || '', reason: '' });
  const approving = mode === 'approve';
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  const submit = (event) => {
    event.preventDefault();
    onSave(approving ? { admissionNumber: form.admissionNumber, academicYear: form.academicYear } : { reason: form.reason });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={approving ? 'Approve Admission' : 'Reject Admission'}
        subtitle={admission?.studentName}
        onClose={onClose}
        maxWidth="max-w-xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className={`inline-flex h-10 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)] ${approving ? 'bg-[#004d4d]' : 'bg-rose-600'}`}>
              {approving ? <BadgeCheck size={16} /> : <XCircle size={16} />}
              {approving ? 'Approve' : 'Reject'}
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6">
          {approving ? (
            <>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Admission Number</span>
                <input value={form.admissionNumber} onChange={(event) => setForm((current) => ({ ...current, admissionNumber: event.target.value }))} className={inputClass} placeholder="Backend can generate one" />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year</span>
                <input value={form.academicYear} onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))} className={inputClass} />
              </label>
            </>
          ) : (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Reason</span>
              <textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className={`${inputClass} py-3`} rows={4} />
            </label>
          )}
        </div>
      </ModalFrame>
    </form>
  );
}

function ConvertModal({ academicData, admission, onClose, onConvert }) {
  const [form, setForm] = useState({
    dob: admission?.dob || '',
    gender: admission?.gender || 'Other',
    academicYear: admission?.academicYear || '',
    classId: '',
    sectionId: '',
  });
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';

  const submit = (event) => {
    event.preventDefault();
    const klass = academicData.classes.find((item) => item.id === form.classId);
    const section = academicData.sections.find((item) => item.id === form.sectionId);
    const payload = {
      gender: form.gender,
      dob: form.dob,
      academicYear: form.academicYear,
      classId: form.classId || undefined,
      className: klass?.name || admission.classInterested || admission.courseInterested,
      sectionId: form.sectionId || undefined,
      sectionName: section?.name || undefined,
    };
    if (!payload.dob && !admission?.dob) {
      toast.error('DOB is required to convert to a student.');
      return;
    }
    if (!payload.academicYear && !admission?.academicYear) {
      toast.error('Academic year is required to convert to a student.');
      return;
    }
    onConvert(payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Convert to Student"
        subtitle={admission?.studentName}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <GraduationCap size={16} /> Convert
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">DOB *</span>
            <input type="date" value={form.dob} onChange={(event) => setForm((current) => ({ ...current, dob: event.target.value }))} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Gender</span>
            <select value={form.gender} onChange={(event) => setForm((current) => ({ ...current, gender: event.target.value }))} className={inputClass}>
              {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Academic Year *</span>
            <select value={form.academicYear} onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))} className={inputClass}>
              <option value="">Select academic year</option>
              {academicData.academicYears.map((year) => <option key={year.id} value={year.name}>{year.name}</option>)}
              {form.academicYear && !academicData.academicYears.some((year) => year.name === form.academicYear) && <option value={form.academicYear}>{form.academicYear}</option>}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class</span>
            <select value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))} className={inputClass}>
              <option value="">Use interested class/course</option>
              {academicData.classes.map((klass) => <option key={klass.id} value={klass.id}>{klass.name}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section</span>
            <select value={form.sectionId} onChange={(event) => setForm((current) => ({ ...current, sectionId: event.target.value }))} className={inputClass}>
              <option value="">No section</option>
              {academicData.sections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

export default function AdmissionsManagement({ currentUser, academicYear = '' }) {
  const [academicData, setAcademicData] = useState({ academicYears: [], courses: [], classes: [], sections: [] });
  const [filters, setFilters] = useState({
    q: '',
    stage: '',
    status: '',
    source: '',
    courseInterested: '',
    academicYear: academicYear || '',
    includeArchived: false,
  });
  const [admissions, setAdmissions] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [admissionModalRecord, setAdmissionModalRecord] = useState(undefined);
  const [followupModalOpen, setFollowupModalOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState('');
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const canCreate = hasPermission(currentUser, 'admissions.create');
  const canEdit = hasPermission(currentUser, 'admissions.edit');
  const canApprove = hasPermission(currentUser, 'admissions.approve');
  const canConvert = hasPermission(currentUser, 'admissions.convert');

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
      console.error('Unable to load admission lookup data.', error);
      toast.error(error?.message || 'Admission lookup data could not be loaded.');
    }
  }, []);

  const loadAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdmissions(buildAdmissionQuery(filters));
      setAdmissions(data.admissions);
      setCount(data.count);
      setLoadError('');
      setSelectedAdmission((current) => {
        if (!current) return current;
        return data.admissions.find((admission) => admission.id === current.id) || current;
      });
    } catch (error) {
      console.error('Unable to load backend admissions.', error);
      setLoadError(error?.message || 'Unable to load admissions from the backend.');
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
      if (active) loadAdmissions();
    });
    return () => {
      active = false;
    };
  }, [loadAdmissions]);

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

  const defaultAcademicYear = filters.academicYear || academicYear || academicData.academicYears[0]?.name || '';

  const courseOptions = useMemo(() => {
    const fromAcademics = academicData.courses.map((course) => course.name).filter(Boolean);
    const fromAdmissions = admissions.map((admission) => admission.courseInterested).filter(Boolean);
    return [...new Set([...fromAcademics, ...fromAdmissions])].sort();
  }, [academicData.courses, admissions]);

  const mergedSourceOptions = useMemo(() => {
    const fromAdmissions = admissions.map((admission) => admission.source).filter(Boolean);
    return [...new Set([...sourceOptions, ...fromAdmissions])].sort();
  }, [admissions]);

  const visibleAdmissions = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    if (!term) return admissions;
    return admissions.filter((admission) => [
      admission.studentName,
      admission.parentName,
      admission.phone,
      admission.email,
      admission.enquiryNumber,
      admission.admissionNumber,
      admission.courseInterested,
      admission.classInterested,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)));
  }, [admissions, filters.q]);

  const admissionsByStage = useMemo(() => stageColumns.reduce((map, stage) => {
    map[stage.id] = visibleAdmissions.filter((admission) => displayStage(admission) === stage.id);
    return map;
  }, {}), [visibleAdmissions]);

  const summary = useMemo(() => visibleAdmissions.reduce((total, admission) => {
    const stage = displayStage(admission);
    return {
      total: total.total + 1,
      enquiry: total.enquiry + (stage === 'enquiry' ? 1 : 0),
      application: total.application + (stage === 'application' ? 1 : 0),
      approved: total.approved + (stage === 'approved' ? 1 : 0),
      converted: total.converted + (stage === 'converted' ? 1 : 0),
    };
  }, { total: 0, enquiry: 0, application: 0, approved: 0, converted: 0 }), [visibleAdmissions]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openAdmission = async (admission) => {
    setSelectedAdmission(admission);
    setDrawerLoading(true);
    try {
      const [record, nextFollowups] = await Promise.all([
        getAdmission(admission.id).catch(() => admission),
        listAdmissionFollowups(admission.id).catch(() => []),
      ]);
      setSelectedAdmission(record || admission);
      setFollowups(nextFollowups);
    } catch (error) {
      toast.error(error?.message || 'Admission details could not be loaded.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedAdmission(null);
    setFollowups([]);
  };

  const refreshSelectedContext = async (admission = selectedAdmission) => {
    if (!admission?.id) return;
    const [record, nextFollowups] = await Promise.all([
      getAdmission(admission.id).catch(() => admission),
      listAdmissionFollowups(admission.id).catch(() => []),
    ]);
    setSelectedAdmission(record || admission);
    setFollowups(nextFollowups);
  };

  const replaceAdmission = (saved) => {
    setAdmissions((current) => current.map((admission) => (admission.id === saved.id ? saved : admission)));
    setSelectedAdmission((current) => (current?.id === saved.id ? saved : current));
  };

  const saveAdmission = async (payload) => {
    const isEdit = Boolean(admissionModalRecord?.id);
    if (isEdit && !canEdit) {
      toast.error('You do not have permission to edit admissions.');
      return;
    }
    if (!isEdit && !canCreate) {
      toast.error('You do not have permission to create admissions.');
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit ? await updateAdmission(admissionModalRecord.id, payload) : await createAdmission(payload);
      setAdmissionModalRecord(undefined);
      toast.success(isEdit ? 'Admission updated' : 'Enquiry created');
      if (isEdit) replaceAdmission(saved);
      await loadAdmissions();
      if (isEdit) await refreshSelectedContext(saved);
    } catch (error) {
      toast.error(error?.message || 'Admission was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveFollowup = async (payload) => {
    if (!selectedAdmission?.id || !canEdit) {
      toast.error('You do not have permission to add follow-ups.');
      return;
    }
    setSaving(true);
    try {
      await addAdmissionFollowup(selectedAdmission.id, payload);
      setFollowupModalOpen(false);
      toast.success('Follow-up added');
      await Promise.all([loadAdmissions(), refreshSelectedContext()]);
    } catch (error) {
      toast.error(error?.message || 'Follow-up was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToApplication = async (admission) => {
    if (!canEdit) {
      toast.error('You do not have permission to update admissions.');
      return;
    }
    try {
      const saved = await moveAdmissionToApplication(admission.id);
      replaceAdmission(saved);
      toast.success('Moved to application');
      await loadAdmissions();
      await refreshSelectedContext(saved);
    } catch (error) {
      toast.error(error?.message || 'Admission was not moved.');
    }
  };

  const saveDecision = async (payload) => {
    if (!selectedAdmission?.id || !canApprove) {
      toast.error('You do not have permission to approve or reject admissions.');
      return;
    }
    setSaving(true);
    try {
      const saved = decisionMode === 'approve'
        ? await approveAdmission(selectedAdmission.id, payload)
        : await rejectAdmission(selectedAdmission.id, payload);
      setDecisionMode('');
      replaceAdmission(saved);
      toast.success(decisionMode === 'approve' ? 'Admission approved' : 'Admission rejected');
      await loadAdmissions();
      await refreshSelectedContext(saved);
    } catch (error) {
      toast.error(error?.message || 'Admission decision was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const saveConversion = async (payload) => {
    if (!selectedAdmission?.id || !canConvert) {
      toast.error('You do not have permission to convert admissions.');
      return;
    }
    setSaving(true);
    try {
      await convertAdmissionToStudent(selectedAdmission.id, payload);
      setConvertModalOpen(false);
      toast.success('Admission converted to student');
      await loadAdmissions();
      await refreshSelectedContext();
    } catch (error) {
      toast.error(error?.message || 'Admission was not converted.');
    } finally {
      setSaving(false);
    }
  };

  const archiveOrRestore = async (admission) => {
    if (!canEdit) {
      toast.error('You do not have permission to archive admissions.');
      return;
    }
    try {
      const saved = admission.archived ? await restoreAdmission(admission.id) : await archiveAdmission(admission.id);
      replaceAdmission(saved);
      toast.success(admission.archived ? 'Admission restored' : 'Admission archived');
      await loadAdmissions();
      await refreshSelectedContext(saved);
    } catch (error) {
      toast.error(error?.message || 'Archive status was not updated.');
    }
  };

  const canMoveSelected = selectedAdmission && !selectedAdmission.archived && selectedAdmission.stage === 'enquiry' && canEdit;
  const canDecideSelected = selectedAdmission && !selectedAdmission.archived && selectedAdmission.stage === 'application' && canApprove;
  const canConvertSelected = selectedAdmission && !selectedAdmission.archived && selectedAdmission.stage === 'approved' && canConvert;

  return (
    <div className="erp-admissions-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase text-[#3f4848]">
            <span>Management</span>
            <span>/</span>
            <span className="text-[#006a62]">Admissions</span>
          </div>
          <h1 className="font-['Montserrat'] text-3xl font-bold text-[#003434]">Admissions Pipeline</h1>
          <p className="mt-2 text-sm text-[#3f4848]">Backend-backed enquiry to student conversion workflow.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        {canCreate && (
          <button type="button" onClick={() => setAdmissionModalRecord(null)} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
            <Plus size={17} /> Add Enquiry
          </button>
        )}
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        {[
          ['Total Pipeline', summary.total, <UserPlus key="total-icon" size={18} className="text-[#006a62]" />],
          ['Enquiry', summary.enquiry, <CircleDot key="enquiry-icon" size={18} className="text-[#006a62]" />],
          ['Application', summary.application, <ClipboardCheck key="application-icon" size={18} className="text-[#006a62]" />],
          ['Approved', summary.approved, <BadgeCheck key="approved-icon" size={18} className="text-[#006a62]" />],
          ['Converted', summary.converted, <GraduationCap key="converted-icon" size={18} className="text-[#006a62]" />],
        ].map(([label, value, icon]) => (
          <div key={label} className="erp-glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#3f4848]">{label}</span>
              {icon}
            </div>
            <div className="mt-3 font-['Montserrat'] text-3xl font-bold text-[#003434]">{loading ? '-' : value}</div>
          </div>
        ))}
      </section>

      <section className="erp-glass-card mb-6 rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <label className="lg:col-span-4">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Filter Loaded Records</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={17} />
              <input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 pl-10 pr-4 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20" placeholder="Name, enquiry no, phone" />
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
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Stage</span>
            <select value={filters.stage} onChange={(event) => updateFilter('stage', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
              <option value="">All stages</option>
              {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Source</span>
            <select value={filters.source} onChange={(event) => updateFilter('source', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
              <option value="">All sources</option>
              {mergedSourceOptions.map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
          </label>
          <label className="lg:col-span-4">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Course Interested</span>
            <select value={filters.courseInterested} onChange={(event) => updateFilter('courseInterested', event.target.value)} className="h-11 w-full rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62]">
              <option value="">All courses</option>
              {courseOptions.map((course) => <option key={course} value={course}>{course}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-3 lg:col-span-4">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-white/40 bg-white/35 px-3 text-xs font-semibold text-[#3f4848]">
              <input type="checkbox" checked={filters.includeArchived} onChange={(event) => updateFilter('includeArchived', event.target.checked)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
              Include archived
            </label>
            <button type="button" onClick={loadAdmissions} className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#004d4d] text-white" aria-label="Refresh admissions">
              <RefreshCcw size={17} />
            </button>
          </div>
          <div className="flex items-end lg:col-span-4">
            <p className="text-sm font-semibold text-[#3f4848]">{count} backend record{count === 1 ? '' : 's'} loaded.</p>
          </div>
        </div>
      </section>

      <section className="flex gap-5 overflow-x-auto pb-2">
        {stageColumns.map((stage) => {
          const rows = admissionsByStage[stage.id] || [];
          const Icon = stage.icon;
          return (
            <div key={stage.id} className="flex w-80 shrink-0 flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                  <h3 className="font-bold text-[#003434]">{stage.label}</h3>
                  <span className="rounded bg-white/40 px-2 py-0.5 text-[11px] font-bold text-[#3f4848]">{rows.length}</span>
                </div>
                <Icon size={17} className="text-[#006a62]" />
              </div>

              <div className="erp-admissions-column flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
                {loading && (
                  <div className="erp-glass-card rounded-xl p-5 text-sm font-semibold text-[#3f4848]">
                    <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading...
                  </div>
                )}
                {!loading && rows.map((admission) => (
                  <button key={admission.id} type="button" onClick={() => openAdmission(admission)} className="erp-glass-card w-full rounded-xl p-4 text-left">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${statusClasses(admission.archived ? 'archived' : admission.status)}`}>
                        {admission.archived ? 'archived' : admission.status || 'New'}
                      </span>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} />
                    </div>
                    <h4 className="font-bold text-[#003434]">{admission.studentName || '-'}</h4>
                    <p className="mt-1 text-sm text-[#3f4848]">{admission.courseInterested || admission.classInterested || '-'}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#004d4d] text-[11px] font-bold text-white">
                        {initialsFor(admission.studentName)}
                      </div>
                      <span className="text-[11px] font-semibold text-[#3f4848]">{admission.enquiryNumber || admission.admissionNumber || admission.id}</span>
                    </div>
                  </button>
                ))}
                {!loading && !rows.length && (
                  <div className="rounded-xl border border-dashed border-white/40 bg-white/20 p-6 text-center text-sm font-semibold text-[#3f4848]">
                    No {stage.label.toLowerCase()} records.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {selectedAdmission && (
        <>
          <button type="button" aria-label="Close admission details" onClick={closeDrawer} className="fixed inset-0 z-[70] bg-[#071e27]/30 backdrop-blur-sm" />
          <aside className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-xl flex-col overflow-hidden bg-[#f3faff] shadow-2xl">
            <div className="flex items-center justify-between bg-[#004d4d] px-6 py-5 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/12 text-2xl font-bold text-white">
                  {initialsFor(selectedAdmission.studentName)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/70">{selectedAdmission.enquiryNumber || selectedAdmission.admissionNumber || 'Admission'}</p>
                  <h2 className="text-lg font-bold text-white">{selectedAdmission.studentName || '-'}</h2>
                  <p className="text-sm text-white/70">{selectedAdmission.courseInterested || '-'}</p>
                </div>
              </div>
              <button type="button" onClick={closeDrawer} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {drawerLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#3f4848]">
                  <Loader2 className="animate-spin" size={16} /> Loading details...
                </div>
              )}

              <section className="mb-6 grid grid-cols-2 gap-3">
                <DetailRow label="Stage" value={selectedAdmission.stage} />
                <DetailRow label="Status" value={selectedAdmission.status} />
                <DetailRow label="Parent" value={selectedAdmission.parentName} />
                <DetailRow label="Phone" value={selectedAdmission.phone} />
                <DetailRow label="Email" value={selectedAdmission.email} />
                <DetailRow label="Source" value={selectedAdmission.source} />
                <DetailRow label="Follow-up Date" value={selectedAdmission.followUpDate} />
                <DetailRow label="Academic Year" value={selectedAdmission.academicYear} />
                <DetailRow label="Class Interested" value={selectedAdmission.classInterested} />
                <DetailRow label="Admission No." value={selectedAdmission.admissionNumber} />
                <div className="col-span-2">
                  <DetailRow label="Documents" value={formatDocuments(selectedAdmission.documents)} />
                </div>
                <div className="col-span-2">
                  <DetailRow label="Remarks" value={selectedAdmission.remarks} />
                </div>
                {selectedAdmission.rejectionReason && (
                  <div className="col-span-2">
                    <DetailRow label="Rejection Reason" value={selectedAdmission.rejectionReason} />
                  </div>
                )}
              </section>

              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#003434]">Follow-ups</h3>
                  {canEdit && (
                    <button type="button" onClick={() => setFollowupModalOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#004d4d] px-3 text-xs font-bold text-white">
                      <MessageSquarePlus size={14} /> Add
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {followups.map((followup) => (
                    <div key={followup.id} className="rounded-xl border border-[#cfe6f2] bg-white/55 p-4">
                      <p className="font-semibold text-[#071e27]">{followup.note}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#3f4848]">
                        <span>At: {formatDate(followup.at || followup.createdAt)}</span>
                        <span>Next: {followup.nextFollowUpDate || '-'}</span>
                        <span className="col-span-2">Outcome: {followup.outcome || '-'}</span>
                      </div>
                    </div>
                  ))}
                  {!followups.length && (
                    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">
                      No follow-ups found.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-3 border-t border-[#cfe6f2] bg-white/55 p-5 sm:grid-cols-2">
              {canEdit && (
                <button type="button" onClick={() => setAdmissionModalRecord(selectedAdmission)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-white px-4 text-sm font-bold text-[#004d4d]">
                  <Edit3 size={16} /> Edit
                </button>
              )}
              {canMoveSelected && (
                <button type="button" onClick={() => handleMoveToApplication(selectedAdmission)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
                  <MoveRight size={16} /> To Application
                </button>
              )}
              {canDecideSelected && (
                <>
                  <button type="button" onClick={() => setDecisionMode('approve')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
                    <BadgeCheck size={16} /> Approve
                  </button>
                  <button type="button" onClick={() => setDecisionMode('reject')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white">
                    <XCircle size={16} /> Reject
                  </button>
                </>
              )}
              {canConvertSelected && (
                <button type="button" onClick={() => setConvertModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
                  <GraduationCap size={16} /> Convert
                </button>
              )}
              {canEdit && (
                <button type="button" onClick={() => archiveOrRestore(selectedAdmission)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#cfe6f2] bg-white px-4 text-sm font-bold text-[#004d4d]">
                  {selectedAdmission.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  {selectedAdmission.archived ? 'Restore' : 'Archive'}
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {admissionModalRecord !== undefined && (
        <AdmissionModal
          academicData={academicData}
          defaultAcademicYear={defaultAcademicYear}
          initialRecord={admissionModalRecord}
          onClose={() => setAdmissionModalRecord(undefined)}
          onSave={saveAdmission}
        />
      )}

      {followupModalOpen && (
        <FollowupModal
          admission={selectedAdmission}
          onClose={() => setFollowupModalOpen(false)}
          onSave={saveFollowup}
        />
      )}

      {decisionMode && (
        <DecisionModal
          admission={selectedAdmission}
          mode={decisionMode}
          onClose={() => setDecisionMode('')}
          onSave={saveDecision}
        />
      )}

      {convertModalOpen && (
        <ConvertModal
          academicData={academicData}
          admission={selectedAdmission}
          onClose={() => setConvertModalOpen(false)}
          onConvert={saveConversion}
        />
      )}
    </div>
  );
}
