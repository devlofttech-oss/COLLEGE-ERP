import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  KeyRound,
  Loader2,
  Mail,
  Phone,
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
import { presignUpload, uploadPresignedFile } from '../../api/files';
import {
  addStaffDocument,
  archiveDepartment,
  archiveStaff,
  createDepartment,
  createStaff,
  createStaffLogin,
  getStaff,
  listDepartments,
  listStaff,
  listStaffDocuments,
  rejectStaffDocument,
  restoreStaff,
  updateDepartment,
  updateStaff,
  verifyStaffDocument,
} from '../../api/staff';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const STAFF_TYPES = ['teaching', 'non-teaching'];
const STAFF_STATUSES = ['active', 'inactive'];
const GENDERS = ['Male', 'Female', 'Other'];
const ROLE_OPTIONS = [
  { id: 'super-admin', label: 'Super Admin' },
  { id: 'admin', label: 'Institution Admin' },
  { id: 'principal', label: 'Principal' },
  { id: 'accountant', label: 'Accountant' },
  { id: 'reception', label: 'Reception / Admin Staff' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'parent', label: 'Parent' },
  { id: 'student', label: 'Student' },
];

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

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value).toLocaleDateString();
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return String(value);
}

function initialsFor(name = '') {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';
}

function typeLabel(type) {
  if (type === 'non-teaching') return 'Non-teaching';
  if (type === 'teaching') return 'Teaching';
  return valueOrDash(type);
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'inactive') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'rejected') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (normalized === 'pending') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function buildStaffQuery(filters) {
  return {
    q: filters.q,
    type: filters.type,
    departmentId: filters.departmentId,
    status: filters.status,
    includeArchived: filters.includeArchived ? 'true' : '',
  };
}

function departmentNameFor(staffMember, departmentMap) {
  return staffMember?.department || departmentMap.get(staffMember?.departmentId)?.name || '-';
}

function ModalFrame({ children, footer, maxWidth = 'max-w-4xl', onClose, subtitle, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4">
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,.15)]', maxWidth)}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-500">Faculty & Staff</p>
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

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg bg-[#f8f9fa] p-3">
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{valueOrDash(value)}</p>
    </div>
  );
}

function StaffAvatar({ staffMember, size = 'h-12 w-12' }) {
  if (staffMember?.photoUrl) {
    return (
      <img
        src={staffMember.photoUrl}
        alt=""
        className={cx(size, 'shrink-0 rounded-2xl object-cover ring-1 ring-slate-200')}
      />
    );
  }
  return (
    <div className={cx(size, 'flex shrink-0 items-center justify-center rounded-2xl bg-brand-700 font-bold text-white shadow-[0_10px_24px_rgba(0,77,77,.18)]')}>
      {initialsFor(staffMember?.name)}
    </div>
  );
}

function StaffModal({ departments, initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState(() => ({
    employeeId: initialRecord?.employeeId || '',
    name: initialRecord?.name || '',
    phone: initialRecord?.phone || '',
    email: initialRecord?.email || '',
    type: initialRecord?.type || 'teaching',
    departmentId: initialRecord?.departmentId || '',
    department: initialRecord?.department || '',
    designation: initialRecord?.designation || '',
    qualification: initialRecord?.qualification || '',
    joiningDate: initialRecord?.joiningDate || '',
    address: initialRecord?.address || '',
    gender: initialRecord?.gender || 'Other',
    dob: initialRecord?.dob || '',
    role: initialRecord?.role || '',
    status: initialRecord?.status || 'active',
    photoUrl: initialRecord?.photoUrl || '',
    photoKey: initialRecord?.photoKey || '',
  }));

  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const updateDepartment = (departmentId) => {
    const selected = departments.find((department) => department.id === departmentId);
    setForm((current) => ({
      ...current,
      departmentId,
      department: selected?.name || current.department,
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Phone is required.');
      return;
    }
    onSave({ form, photoFile });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Staff' : 'Add Staff'}
        subtitle={isEdit ? initialRecord.employeeId : 'Employee ID is generated by the backend when left blank.'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,77,77,.18)]">
              <CheckCircle2 size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="max-h-[62vh] space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-800">Profile</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Employee ID</span>
                <input value={form.employeeId} onChange={(event) => update('employeeId', event.target.value)} className={inputClass} placeholder="Auto on create" />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Name *</span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Phone *</span>
                <input value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Email</span>
                <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Type</span>
                <select value={form.type} onChange={(event) => update('type', event.target.value)} className={inputClass}>
                  {STAFF_TYPES.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
                <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                  {STAFF_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Department</span>
                <select value={form.departmentId} onChange={(event) => updateDepartment(event.target.value)} className={inputClass}>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  {form.departmentId && !departments.some((department) => department.id === form.departmentId) && <option value={form.departmentId}>{form.department || form.departmentId}</option>}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Department Name</span>
                <input value={form.department} onChange={(event) => update('department', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Designation</span>
                <input value={form.designation} onChange={(event) => update('designation', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Qualification</span>
                <input value={form.qualification} onChange={(event) => update('qualification', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Joining Date</span>
                <input type="date" value={form.joiningDate} onChange={(event) => update('joiningDate', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Date of Birth</span>
                <input type="date" value={form.dob} onChange={(event) => update('dob', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Gender</span>
                <select value={form.gender} onChange={(event) => update('gender', event.target.value)} className={inputClass}>
                  {GENDERS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Linked Role</span>
                <select value={form.role} onChange={(event) => update('role', event.target.value)} className={inputClass}>
                  <option value="">No role set</option>
                  {ROLE_OPTIONS.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                  {form.role && !ROLE_OPTIONS.some((role) => role.id === form.role) && <option value={form.role}>{form.role}</option>}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-800">Photo & Address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Photo File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Photo URL</span>
                <input value={form.photoUrl} onChange={(event) => update('photoUrl', event.target.value)} className={inputClass} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Photo Key</span>
                <input value={form.photoKey} onChange={(event) => update('photoKey', event.target.value)} className={inputClass} />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-bold text-slate-500">Address</span>
                <textarea value={form.address} onChange={(event) => update('address', event.target.value)} className={`${inputClass} py-3`} rows={3} />
              </label>
            </div>
          </section>
        </div>
      </ModalFrame>
    </form>
  );
}

function DepartmentModal({ initialRecord, staffMembers, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    name: initialRecord?.name || '',
    code: initialRecord?.code || '',
    headStaffId: initialRecord?.headStaffId || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Department name is required.');
      return;
    }
    onSave({
      name: form.name.trim(),
      code: form.code.trim() || null,
      headStaffId: form.headStaffId || null,
      status: form.status || null,
    });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Department' : 'Add Department'}
        subtitle={isEdit ? initialRecord.code : 'Creates a backend department record.'}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white">
              <CheckCircle2 size={16} /> Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Name *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Code</span>
            <input value={form.code} onChange={(event) => update('code', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Head Staff</span>
            <select value={form.headStaffId} onChange={(event) => update('headStaffId', event.target.value)} className={inputClass}>
              <option value="">No head assigned</option>
              {staffMembers.map((staffMember) => <option key={staffMember.id} value={staffMember.id}>{staffMember.name}</option>)}
              {form.headStaffId && !staffMembers.some((staffMember) => staffMember.id === form.headStaffId) && <option value={form.headStaffId}>{form.headStaffId}</option>}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {STAFF_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function DocumentModal({ staffMember, onClose, onSave }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ type: '', fileKey: '', fileName: '', fileSize: '', contentType: '' });
  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    onSave({ form, file });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Add Staff Document"
        subtitle={staffMember?.name}
        onClose={onClose}
        maxWidth="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white">
              <Upload size={16} /> Attach
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Type *</span>
            <input value={form.type} onChange={(event) => update('type', event.target.value)} className={inputClass} placeholder="qualification, id-proof, contract..." />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">File</span>
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
            <span className="mb-1.5 block text-xs font-bold text-slate-500">File Key *</span>
            <input value={form.fileKey} onChange={(event) => update('fileKey', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">File Name</span>
            <input value={form.fileName} onChange={(event) => update('fileName', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">File Size</span>
            <input value={form.fileSize} onChange={(event) => update('fileSize', event.target.value)} className={inputClass} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Content Type</span>
            <input value={form.contentType} onChange={(event) => update('contentType', event.target.value)} className={inputClass} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function LoginModal({ staffMember, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    email: staffMember?.email || '',
    password: '',
    role: staffMember?.role || (staffMember?.type === 'teaching' ? 'teacher' : 'reception'),
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.email.trim()) {
      toast.error('Email is required.');
      return;
    }
    if (!form.password) {
      toast.error('Password is required.');
      return;
    }
    if (!form.role) {
      toast.error('Role is required.');
      return;
    }
    onSave({ email: form.email.trim(), password: form.password, role: form.role });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title="Create Staff Login"
        subtitle={staffMember?.name}
        onClose={onClose}
        maxWidth="max-w-xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-slate-100 px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white">
              <KeyRound size={16} /> Create
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Email *</span>
            <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Password *</span>
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Backend Role *</span>
            <select value={form.role} onChange={(event) => update('role', event.target.value)} className={inputClass}>
              {ROLE_OPTIONS.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

export default function FacultyStaffManagement({ currentUser }) {
  const [staffMembers, setStaffMembers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [drawerTab, setDrawerTab] = useState('profile');
  const [staffModalRecord, setStaffModalRecord] = useState(undefined);
  const [departmentModalRecord, setDepartmentModalRecord] = useState(undefined);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    departmentId: '',
    status: 'active',
    includeArchived: false,
  });

  const canView = hasPermission(currentUser, 'staff.view');
  const canCreate = hasPermission(currentUser, 'staff.create');
  const canEdit = hasPermission(currentUser, 'staff.edit');
  const canArchive = hasPermission(currentUser, 'staff.archive');

  const departmentMap = useMemo(() => new Map(departments.map((department) => [department.id, department])), [departments]);

  const loadDepartments = useCallback(async () => {
    try {
      setDepartments(await listDepartments());
    } catch (error) {
      console.error('Unable to load backend departments.', error);
      toast.error(error?.message || 'Departments could not be loaded.');
    }
  }, []);

  const loadStaff = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const data = await listStaff(buildStaffQuery(filters));
      setStaffMembers(data.staff);
      setCount(data.count);
      setLoadError('');
      setSelectedStaff((current) => {
        if (!current) return current;
        return data.staff.find((item) => item.id === current.id) || current;
      });
    } catch (error) {
      console.error('Unable to load backend staff records.', error);
      setLoadError(error?.message || 'Unable to load staff from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, filters]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active || !canView) return;
      await Promise.all([loadDepartments(), loadStaff()]);
    });
    return () => {
      active = false;
    };
  }, [canView, loadDepartments, loadStaff]);

  const openStaff = async (staffMember) => {
    setSelectedStaff(staffMember);
    setDrawerTab('profile');
    setDrawerLoading(true);
    try {
      const [record, nextDocuments] = await Promise.all([
        getStaff(staffMember.id).catch(() => staffMember),
        listStaffDocuments(staffMember.id).catch(() => []),
      ]);
      setSelectedStaff(record || staffMember);
      setDocuments(nextDocuments);
    } catch (error) {
      toast.error(error?.message || 'Staff details could not be loaded.');
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedStaff(null);
    setDocuments([]);
    setDrawerTab('profile');
  };

  const reloadSelectedContext = async (staffMember = selectedStaff) => {
    if (!staffMember?.id) return;
    const [record, nextDocuments] = await Promise.all([
      getStaff(staffMember.id).catch(() => staffMember),
      listStaffDocuments(staffMember.id).catch(() => []),
    ]);
    setSelectedStaff(record || staffMember);
    setDocuments(nextDocuments);
  };

  const saveStaffRecord = async ({ form, photoFile }) => {
    const isEdit = Boolean(staffModalRecord?.id);
    if (isEdit ? !canEdit : !canCreate) {
      toast.error(isEdit ? 'You do not have permission to edit staff records.' : 'You do not have permission to create staff records.');
      return;
    }

    setSaving(true);
    try {
      let payload = compactPayload({
        employeeId: cleanString(form.employeeId) || undefined,
        name: cleanString(form.name),
        phone: cleanString(form.phone),
        email: cleanString(form.email) || null,
        type: form.type,
        departmentId: form.departmentId || null,
        department: cleanString(form.department) || null,
        designation: cleanString(form.designation) || null,
        qualification: cleanString(form.qualification) || null,
        joiningDate: form.joiningDate || null,
        address: cleanString(form.address) || null,
        gender: form.gender || null,
        dob: form.dob || null,
        role: form.role || null,
        status: form.status,
        photoKey: cleanString(form.photoKey) || null,
        photoUrl: cleanString(form.photoUrl) || null,
      });

      if (photoFile) {
        const upload = await presignUpload({
          folder: 'profile-photos',
          ownerId: staffModalRecord?.id || form.employeeId || form.name || 'staff',
          filename: photoFile.name,
          contentType: photoFile.type,
          sizeBytes: photoFile.size,
        });
        await uploadPresignedFile({
          uploadUrl: upload.uploadUrl,
          method: upload.method,
          headers: upload.headers,
          file: photoFile,
        });
        payload = {
          ...payload,
          photoKey: upload.key,
          photoUrl: upload.publicUrl || payload.photoUrl,
        };
      }

      const saved = isEdit
        ? await updateStaff(staffModalRecord.id, payload)
        : await createStaff(payload);
      setStaffModalRecord(undefined);
      toast.success(isEdit ? 'Staff record updated' : 'Staff record created');
      await Promise.all([loadStaff(), reloadSelectedContext(saved)]);
    } catch (error) {
      toast.error(error?.message || 'Staff record was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const archiveOrRestoreStaff = async (staffMember) => {
    if (!canArchive) {
      toast.error('You do not have permission to archive staff records.');
      return;
    }
    const action = staffMember.archived ? 'restore' : 'archive';
    if (!window.confirm(`Do you want to ${action} ${staffMember.name || 'this staff record'}?`)) return;
    try {
      const saved = staffMember.archived ? await restoreStaff(staffMember.id) : await archiveStaff(staffMember.id);
      setStaffMembers((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setSelectedStaff((current) => (current?.id === saved.id ? saved : current));
      toast.success(staffMember.archived ? 'Staff record restored' : 'Staff record archived');
      await loadStaff();
    } catch (error) {
      toast.error(error?.message || 'Archive status was not updated.');
    }
  };

  const saveDepartment = async (payload) => {
    const isEdit = Boolean(departmentModalRecord?.id);
    if (isEdit ? !canEdit : !canCreate) {
      toast.error(isEdit ? 'You do not have permission to edit departments.' : 'You do not have permission to create departments.');
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateDepartment(departmentModalRecord.id, payload)
        : await createDepartment(payload);
      setDepartmentModalRecord(undefined);
      setDepartments((current) => {
        const exists = current.some((department) => department.id === saved.id);
        return exists ? current.map((department) => (department.id === saved.id ? saved : department)) : [...current, saved];
      });
      toast.success(isEdit ? 'Department updated' : 'Department created');
      await loadDepartments();
    } catch (error) {
      toast.error(error?.message || 'Department was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const archiveSelectedDepartment = async (department) => {
    if (!canArchive) {
      toast.error('You do not have permission to archive departments.');
      return;
    }
    if (!window.confirm(`Archive ${department.name || 'this department'}?`)) return;
    try {
      await archiveDepartment(department.id);
      setDepartments((current) => current.filter((item) => item.id !== department.id));
      toast.success('Department archived');
      await loadDepartments();
    } catch (error) {
      toast.error(error?.message || 'Department was not archived.');
    }
  };

  const saveDocument = async ({ form, file }) => {
    if (!selectedStaff?.id || !canEdit) {
      toast.error('You do not have permission to edit staff documents.');
      return;
    }
    setSaving(true);
    try {
      let payload = {
        type: cleanString(form.type),
        fileKey: cleanString(form.fileKey),
        fileName: cleanString(form.fileName) || null,
        fileSize: form.fileSize ? Number(form.fileSize) || form.fileSize : null,
        contentType: cleanString(form.contentType) || null,
      };

      if (file) {
        const upload = await presignUpload({
          folder: 'staff-documents',
          ownerId: selectedStaff.id,
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

      const saved = await addStaffDocument(selectedStaff.id, payload);
      setDocuments((current) => [saved, ...current]);
      setDocumentModalOpen(false);
      toast.success('Staff document attached');
      await reloadSelectedContext();
    } catch (error) {
      toast.error(error?.message || 'Staff document was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const setDocumentStatus = async (document, nextStatus) => {
    if (!selectedStaff?.id || !canEdit) {
      toast.error('You do not have permission to edit staff documents.');
      return;
    }
    const remarks = window.prompt('Remarks', document.remarks || '');
    if (remarks === null) return;
    try {
      const saved = nextStatus === 'verified'
        ? await verifyStaffDocument(selectedStaff.id, document.id, remarks)
        : await rejectStaffDocument(selectedStaff.id, document.id, remarks);
      setDocuments((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      toast.success(nextStatus === 'verified' ? 'Document verified' : 'Document rejected');
    } catch (error) {
      toast.error(error?.message || 'Document status was not updated.');
    }
  };

  const saveLogin = async (payload) => {
    if (!selectedStaff?.id || !canCreate) {
      toast.error('You do not have permission to create staff logins.');
      return;
    }
    setSaving(true);
    try {
      const result = await createStaffLogin(selectedStaff.id, payload);
      setSelectedStaff(result.staff);
      setLoginModalOpen(false);
      toast.success('Staff login created');
      await loadStaff();
    } catch (error) {
      toast.error(error?.message || 'Staff login was not created.');
    } finally {
      setSaving(false);
    }
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const summary = useMemo(() => {
    const active = staffMembers.filter((staffMember) => staffMember.status === 'active' && !staffMember.archived).length;
    const teaching = staffMembers.filter((staffMember) => staffMember.type === 'teaching').length;
    const nonTeaching = staffMembers.filter((staffMember) => staffMember.type === 'non-teaching').length;
    const linked = staffMembers.filter((staffMember) => staffMember.userId).length;
    return { active, teaching, nonTeaching, linked };
  }, [staffMembers]);

  if (!canView) {
    return (
      <div className="erp-staff-page min-w-0">
        <section className="tt-card p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Faculty & Staff</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">You do not have permission to view staff records.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="erp-staff-page min-w-0">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty &amp; Staff</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={loadStaff} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-brand-700">
            <RefreshCcw size={17} /> Refresh
          </button>
          {canCreate && (
            <button type="button" onClick={() => setStaffModalRecord(null)} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(0,77,77,.2)] disabled:bg-slate-300">
              <Plus size={17} /> Add Staff
            </button>
          )}
        </div>
      </div>

      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        {[
          ['Loaded Staff', count, <Users key="staff-icon" size={18} className="text-emerald-600" />],
          ['Active', summary.active, <BadgeCheck key="active-icon" size={18} className="text-emerald-600" />],
          ['Teaching', summary.teaching, <UserRound key="teaching-icon" size={18} className="text-emerald-600" />],
          ['Non-teaching', summary.nonTeaching, <Building2 key="non-teaching-icon" size={18} className="text-emerald-600" />],
          ['Linked Logins', summary.linked, <KeyRound key="login-icon" size={18} className="text-emerald-600" />],
        ].map(([label, value, icon]) => (
          <div key={label} className="tt-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500">{label}</span>
              {icon}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-800">{loading ? '-' : value}</div>
          </div>
        ))}
      </section>

      <section className="tt-card mb-6 rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-12">
          <label className="lg:col-span-4">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Search Loaded Records</span>
            <span className="relative block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8f9fa] pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" placeholder="Name or employee ID" />
            </span>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Type</span>
            <select value={filters.type} onChange={(event) => updateFilter('type', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500">
              <option value="">All types</option>
              {STAFF_TYPES.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Department</span>
            <select value={filters.departmentId} onChange={(event) => updateFilter('departmentId', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500">
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500">
              <option value="">All statuses</option>
              {STAFF_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-3 lg:col-span-2">
            <label className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-500">
              <input type="checkbox" checked={filters.includeArchived} onChange={(event) => updateFilter('includeArchived', event.target.checked)} className="h-4 w-4 rounded border-slate-200 text-emerald-600" />
              Archived
            </label>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="tt-card overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-800">Staff Records</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">{count} backend record{count === 1 ? '' : 's'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-slate-500">
                      <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading staff...
                    </td>
                  </tr>
                )}
                {!loading && staffMembers.map((staffMember) => (
                  <tr key={staffMember.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openStaff(staffMember)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <StaffAvatar staffMember={staffMember} />
                        <div>
                          <p className="font-bold text-slate-900">{staffMember.name || '-'}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{staffMember.employeeId || staffMember.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      <div className="flex items-center gap-2"><Phone size={14} /> {valueOrDash(staffMember.phone)}</div>
                      <div className="mt-1 flex items-center gap-2"><Mail size={14} /> {valueOrDash(staffMember.email)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{departmentNameFor(staffMember, departmentMap)}</p>
                      <p className="mt-1 text-xs text-slate-500">{valueOrDash(staffMember.designation)}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-500">{typeLabel(staffMember.type)}</td>
                    <td className="px-5 py-4">
                      <span className={cx('inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(staffMember.archived ? 'archived' : staffMember.status))}>
                        {staffMember.archived ? 'archived' : staffMember.status || 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                        <button type="button" onClick={() => openStaff(staffMember)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8f9fa] text-brand-700" aria-label="View staff">
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button type="button" onClick={() => setStaffModalRecord(staffMember)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8f9fa] text-brand-700" aria-label="Edit staff">
                            <Edit3 size={15} />
                          </button>
                        )}
                        {canArchive && (
                          <button type="button" onClick={() => archiveOrRestoreStaff(staffMember)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8f9fa] text-brand-700" aria-label={staffMember.archived ? 'Restore staff' : 'Archive staff'}>
                            {staffMember.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !staffMembers.length && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center text-sm font-semibold text-slate-500">No staff records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="tt-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Departments</p>
                <h2 className="text-lg font-bold text-slate-800">Backend Records</h2>
              </div>
              {canCreate && (
                <button type="button" onClick={() => setDepartmentModalRecord(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white" aria-label="Add department">
                  <Plus size={16} />
                </button>
              )}
            </div>
            <div className="space-y-3">
              {departments.map((department) => {
                const head = staffMembers.find((staffMember) => staffMember.id === department.headStaffId);
                return (
                  <div key={department.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{department.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{department.code || 'No code'} | Head: {head?.name || department.headStaffId || '-'}</p>
                      </div>
                      <span className={cx('rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase', statusClasses(department.status))}>{department.status || '-'}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {canEdit && (
                        <button type="button" onClick={() => setDepartmentModalRecord(department)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-brand-700">
                          <Edit3 size={13} /> Edit
                        </button>
                      )}
                      {canArchive && (
                        <button type="button" onClick={() => archiveSelectedDepartment(department)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-brand-700">
                          <Archive size={13} /> Archive
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {!departments.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">No departments found.</div>}
            </div>
          </section>
        </aside>
      </div>

      {selectedStaff && (
        <>
          <button type="button" aria-label="Close staff details" onClick={closeDrawer} className="fixed inset-0 z-[70] bg-slate-900/20" />
          <aside className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-brand-700 px-6 py-5 text-white">
              <div className="flex min-w-0 items-center gap-4">
                <StaffAvatar staffMember={selectedStaff} size="h-16 w-16" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white/70">{selectedStaff.employeeId || 'Staff'}</p>
                  <h2 className="truncate text-lg font-bold text-white">{selectedStaff.name || '-'}</h2>
                  <p className="truncate text-sm text-white/70">{departmentNameFor(selectedStaff, departmentMap)} | {typeLabel(selectedStaff.type)}</p>
                </div>
              </div>
              <button type="button" onClick={closeDrawer} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close">
                <X size={17} />
              </button>
            </div>

            <div className="flex border-b border-slate-100 bg-white px-4 py-3">
              {[
                { id: 'profile', label: 'Profile', icon: UserRound },
                { id: 'documents', label: 'Documents', icon: FileText, value: documents.length },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id)}
                    className={cx('mr-2 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-bold', drawerTab === tab.id ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
                  >
                    <Icon size={15} /> {tab.label}{tab.value !== undefined ? ` (${tab.value})` : ''}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto">
              {drawerLoading && (
                <div className="m-6 flex items-center gap-2 text-sm font-semibold text-slate-500">
                  <Loader2 className="animate-spin" size={16} /> Loading details...
                </div>
              )}

              {drawerTab === 'profile' && (
                <div className="space-y-6 p-6">
                  <section className="grid grid-cols-2 gap-3">
                    <DetailRow label="Employee ID" value={selectedStaff.employeeId || selectedStaff.id} />
                    <DetailRow label="Status" value={selectedStaff.archived ? 'archived' : selectedStaff.status} />
                    <DetailRow label="Type" value={typeLabel(selectedStaff.type)} />
                    <DetailRow label="Designation" value={selectedStaff.designation} />
                    <DetailRow label="Department" value={departmentNameFor(selectedStaff, departmentMap)} />
                    <DetailRow label="Qualification" value={selectedStaff.qualification} />
                    <DetailRow label="Phone" value={selectedStaff.phone} />
                    <DetailRow label="Email" value={selectedStaff.email} />
                    <DetailRow label="Joining Date" value={selectedStaff.joiningDate} />
                    <DetailRow label="Date of Birth" value={selectedStaff.dob} />
                    <DetailRow label="Gender" value={selectedStaff.gender} />
                    <DetailRow label="Linked Role" value={selectedStaff.role} />
                    <DetailRow label="User ID" value={selectedStaff.userId} />
                    <DetailRow label="Created" value={formatDate(selectedStaff.createdAt)} />
                    <div className="col-span-2">
                      <DetailRow label="Address" value={selectedStaff.address} />
                    </div>
                    <div className="col-span-2">
                      <DetailRow label="Photo Key" value={selectedStaff.photoKey} />
                    </div>
                  </section>
                </div>
              )}

              {drawerTab === 'documents' && (
                <div className="space-y-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-800">Staff Documents</h4>
                    {canEdit && (
                      <button type="button" onClick={() => setDocumentModalOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-700 px-3 text-xs font-bold text-white">
                        <Plus size={14} /> Add
                      </button>
                    )}
                  </div>
                  {documents.map((document) => (
                    <div key={document.id} className="rounded-xl border border-slate-100 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{document.type || 'document'}</p>
                          <p className="mt-1 break-all text-xs text-slate-500">{document.fileName || document.fileKey || '-'}</p>
                          {document.remarks && <p className="mt-2 text-xs text-slate-500">{document.remarks}</p>}
                        </div>
                        <span className={cx('inline-flex shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(document.status))}>
                          {document.status || 'pending'}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {document.url && (
                          <a href={document.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-2 rounded-lg bg-white px-3 text-xs font-bold text-brand-700">
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
                  {!documents.length && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">No staff documents found.</div>}
                </div>
              )}
            </div>

            <div className="grid gap-3 border-t border-slate-100 bg-white p-5 sm:grid-cols-2">
              {canEdit && (
                <button type="button" onClick={() => setStaffModalRecord(selectedStaff)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-4 text-sm font-bold text-brand-700">
                  <Edit3 size={16} /> Edit
                </button>
              )}
              {canCreate && !selectedStaff.userId && (
                <button type="button" onClick={() => setLoginModalOpen(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white">
                  <KeyRound size={16} /> Create Login
                </button>
              )}
              {canArchive && (
                <button type="button" onClick={() => archiveOrRestoreStaff(selectedStaff)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-4 text-sm font-bold text-brand-700">
                  {selectedStaff.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  {selectedStaff.archived ? 'Restore' : 'Archive'}
                </button>
              )}
            </div>
          </aside>
        </>
      )}

      {staffModalRecord !== undefined && (
        <StaffModal
          departments={departments}
          initialRecord={staffModalRecord}
          onClose={() => setStaffModalRecord(undefined)}
          onSave={saveStaffRecord}
        />
      )}

      {departmentModalRecord !== undefined && (
        <DepartmentModal
          initialRecord={departmentModalRecord}
          staffMembers={staffMembers}
          onClose={() => setDepartmentModalRecord(undefined)}
          onSave={saveDepartment}
        />
      )}

      {documentModalOpen && (
        <DocumentModal
          staffMember={selectedStaff}
          onClose={() => setDocumentModalOpen(false)}
          onSave={saveDocument}
        />
      )}

      {loginModalOpen && (
        <LoginModal
          staffMember={selectedStaff}
          onClose={() => setLoginModalOpen(false)}
          onSave={saveLogin}
        />
      )}
    </div>
  );
}
