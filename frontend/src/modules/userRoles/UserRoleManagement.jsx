import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Edit3,
  Eye,
  Link2,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInput } from '../../components/ui';
import { listStudents } from '../../api/students';
import {
  archiveUser,
  changeUserRole,
  createUser,
  getUser,
  listUsers,
  restoreUser,
  setLinkedStudents,
  updateUser,
} from '../../api/users';
import {
  backendUserRoles,
  filterBackendUsers,
  formatDisplayDate,
  getUserId,
  getUserRole,
  getUserStatus,
  roleLabel,
  summarizeUsers,
  validateUserForm,
  validateUserUpdate,
} from './rolePermissions';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const statusOptions = ['active', 'suspended'];
const textInputClass = 'w-full min-h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-70';

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || ADMIN_ROLES.has(user?.role) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function activeItems(items = []) {
  return items.filter((item) => !item.archived && String(item.status || 'active').toLowerCase() !== 'inactive');
}

function arraysEqual(first = [], second = []) {
  if (first.length !== second.length) return false;
  const values = new Set(first);
  return second.every((item) => values.has(item));
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'active') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (normalized === 'suspended' || normalized === 'inactive') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
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

function TextField({ disabled, label, onChange, type = 'text', value }) {
  const inputProps = {
    value: value || '',
    onChange: (event) => onChange(event.target.value),
    disabled,
    className: textInputClass,
  };
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      {type === 'password'
        ? <PasswordInput {...inputProps} />
        : <input type={type} {...inputProps} />}
    </label>
  );
}

function RoleBadge({ role }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-brand-700">
      <ShieldCheck size={13} /> {roleLabel(role)}
    </span>
  );
}

function ModalFrame({ children, footer, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,.15)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-500">Users</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
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

function UserModal({ initialUser = null, onClose, onSave, saving, students = [] }) {
  const isEdit = Boolean(getUserId(initialUser));
  const initialRole = getUserRole(initialUser) || 'admin';
  const initialLinkedIds = Array.isArray(initialUser?.linkedStudentIds) ? initialUser.linkedStudentIds : [];
  const [form, setForm] = useState(() => ({
    name: initialUser?.name || '',
    email: initialUser?.email || '',
    password: '',
    role: initialRole,
    phone: initialUser?.phone || '',
    status: getUserStatus(initialUser),
    linkedStudentIds: initialLinkedIds,
  }));
  const showLinkedStudents = ['parent', 'student'].includes(form.role);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleLinkedStudent = (studentId) => setForm((current) => {
    const next = new Set(current.linkedStudentIds || []);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    return { ...current, linkedStudentIds: [...next] };
  });
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      linkedStudentIds: showLinkedStudents ? form.linkedStudentIds : [],
    });
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit User' : 'Create User'}
        onClose={onClose}
        footer={(
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-500">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-700 px-5 text-sm font-bold text-white disabled:opacity-70">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[68vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
          <TextField disabled={saving} label="Name *" value={form.name} onChange={(value) => update('name', value)} />
          <TextField disabled={isEdit || saving} label="Email *" type="email" value={form.email} onChange={(value) => update('email', value)} />
          {!isEdit && <TextField disabled={saving} label="Password *" type="password" value={form.password} onChange={(value) => update('password', value)} />}
          <TextField disabled={saving} label="Phone" value={form.phone} onChange={(value) => update('phone', value)} />
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Role *</span>
            <select value={form.role} onChange={(event) => update('role', event.target.value)} disabled={saving} className={textInputClass}>
              {backendUserRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} disabled={saving} className={textInputClass}>
              {statusOptions.map((status) => <option key={status} value={status}>{roleLabel(status)}</option>)}
            </select>
          </label>
          {showLinkedStudents && (
            <fieldset className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <legend className="px-1 text-xs font-bold text-slate-500">Linked Students</legend>
              <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {students.map((student) => (
                  <label key={student.id} className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3 text-sm font-semibold text-slate-500">
                    <input
                      type="checkbox"
                      checked={(form.linkedStudentIds || []).includes(student.id)}
                      onChange={() => toggleLinkedStudent(student.id)}
                      disabled={saving}
                      className="h-4 w-4 rounded border-slate-200 text-brand-500"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-slate-900">{student.name}</span>
                      <span className="block truncate text-xs">{student.admissionNumber || student.rollNumber || student.id}</span>
                    </span>
                  </label>
                ))}
                {!students.length && <div className="sm:col-span-2"><EmptyState message="No students available." /></div>}
              </div>
            </fieldset>
          )}
        </div>
      </ModalFrame>
    </form>
  );
}

function UsersTable({ canManage, loading, onArchive, onEdit, onOpen, onRestore, selectedUserId, users }) {
  return (
    <section className="tt-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold text-slate-900">Users</h2>
        <span className="text-xs font-bold uppercase text-slate-500">{users.length} listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Role</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Linked</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="px-5 py-10 text-center text-sm font-semibold text-slate-500"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading users...</td></tr>}
            {!loading && users.map((user) => {
              const uid = getUserId(user);
              const isSelected = selectedUserId === uid;
              const archived = Boolean(user.archived);
              return (
                <tr key={uid} className={isSelected ? 'bg-slate-50' : ''}>
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => onOpen(uid)} className="flex min-w-0 items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white"><UserRound size={18} /></span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold text-slate-900">{user.name || '-'}</span>
                        <span className="block truncate text-xs font-semibold text-slate-500">{user.email || '-'}</span>
                      </span>
                    </button>
                  </td>
                  <td className="px-5 py-4"><RoleBadge role={getUserRole(user)} /></td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{user.phone || '-'}</td>
                  <td className="px-5 py-4">
                    <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(archived ? 'archived' : getUserStatus(user)))}>
                      {archived ? 'Archived' : getUserStatus(user)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-500">{(user.linkedStudentIds || []).length}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onOpen(uid)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Eye size={13} /> View</button>
                      {canManage && !archived && <button type="button" onClick={() => onEdit(user)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Edit3 size={13} /> Edit</button>}
                      {canManage && !archived && <button type="button" onClick={() => onArchive(user)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><Archive size={13} /> Archive</button>}
                      {canManage && archived && <button type="button" onClick={() => onRestore(user)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 text-xs font-bold text-brand-700"><ArchiveRestore size={13} /> Restore</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && !users.length && <tr><td colSpan="6" className="px-5 py-12"><EmptyState message="No users found." /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserPreview({ studentMap, user }) {
  const linkedIds = user?.linkedStudentIds || [];
  return (
    <section className="tt-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900">Profile</h2>
        {user && <RoleBadge role={getUserRole(user)} />}
      </div>
      {!user ? (
        <div className="mt-5"><EmptyState message="Select a user to view profile details." /></div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white"><UserRound size={24} /></span>
              <div className="min-w-0">
                <h3 className="truncate text-xl font-bold text-slate-900">{user.name || '-'}</h3>
                <p className="mt-1 truncate text-sm font-semibold text-slate-500">{user.email || '-'}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm"><span className="font-bold text-slate-500">UID</span><br /><b className="break-all text-slate-900">{getUserId(user) || '-'}</b></div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm"><span className="font-bold text-slate-500">Status</span><br /><b className="text-slate-900">{user.archived ? 'archived' : getUserStatus(user)}</b></div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm"><span className="font-bold text-slate-500">Phone</span><br /><b className="text-slate-900">{user.phone || '-'}</b></div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm"><span className="font-bold text-slate-500">Created</span><br /><b className="text-slate-900">{formatDisplayDate(user.createdAt)}</b></div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-900">Linked Students</h3>
            <div className="grid gap-2">
              {linkedIds.map((studentId) => {
                const student = studentMap.get(studentId);
                return (
                  <div key={studentId} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm font-semibold text-slate-500">
                    <Link2 size={14} className="text-brand-500" />
                    <span className="min-w-0 truncate">{student?.name ? `${student.name} - ${studentId}` : studentId}</span>
                  </div>
                );
              })}
              {!linkedIds.length && <EmptyState message="No linked students." />}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function UserRoleManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', status: '', includeArchived: false });
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalUser, setModalUser] = useState(undefined);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'users.view');
  const canManage = hasPermission(currentUser, 'users.manage');

  const loadUsers = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextUsers, studentData] = await Promise.all([
        listUsers({ includeArchived: filters.includeArchived ? 'true' : '' }),
        listStudents({ includeArchived: 'true' }).catch(() => ({ students: [] })),
      ]);
      setUsers(nextUsers);
      setStudentOptions(activeItems(studentData.students || []));
      setSelectedUser((current) => current || nextUsers[0] || null);
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend users.', error);
      setLoadError(error?.message || 'Unable to load users from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, filters.includeArchived]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadUsers();
    });
    return () => {
      active = false;
    };
  }, [loadUsers]);

  const studentMap = useMemo(() => new Map(studentOptions.map((student) => [student.id, student])), [studentOptions]);
  const visibleUsers = useMemo(() => filterBackendUsers(users, filters), [filters, users]);
  const summary = useMemo(() => summarizeUsers(users), [users]);
  const selectedUserId = getUserId(selectedUser);
  const selectedVisibleUser = visibleUsers.find((user) => getUserId(user) === selectedUserId) || visibleUsers[0] || null;

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const openUser = async (uid) => {
    if (!uid) return;
    try {
      const user = await getUser(uid);
      setSelectedUser(user);
    } catch (error) {
      toast.error(error?.message || 'User profile was not loaded.');
    }
  };

  const saveUser = async (form) => {
    if (!canManage) {
      toast.error('You do not have permission to manage users.');
      return;
    }
    const isEdit = Boolean(getUserId(modalUser));
    const validationMessage = isEdit ? validateUserUpdate(form) : validateUserForm(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    setSaving(isEdit ? 'edit' : 'create');
    try {
      let saved;
      if (isEdit) {
        const uid = getUserId(modalUser);
        saved = await updateUser(uid, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          status: form.status,
        });
        if (form.role !== getUserRole(modalUser)) saved = await changeUserRole(uid, form.role);
        if (!arraysEqual(form.linkedStudentIds || [], modalUser.linkedStudentIds || [])) {
          saved = await setLinkedStudents(uid, form.linkedStudentIds || []);
        }
      } else {
        saved = await createUser({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          role: form.role,
          phone: form.phone.trim(),
          status: form.status || 'active',
          linkedStudentIds: form.linkedStudentIds || [],
        });
      }
      setModalUser(undefined);
      setSelectedUser(saved);
      toast.success(isEdit ? 'User updated' : 'User created');
      await loadUsers();
    } catch (error) {
      toast.error(error?.message || 'User was not saved.');
    } finally {
      setSaving('');
    }
  };

  const archiveUserRecord = async (user) => {
    if (!canManage) {
      toast.error('You do not have permission to manage users.');
      return;
    }
    if (!window.confirm(`Archive ${user.name || user.email || 'this user'}?`)) return;
    setSaving(`archive-${getUserId(user)}`);
    try {
      const saved = await archiveUser(getUserId(user));
      setSelectedUser(saved);
      toast.success('User archived');
      await loadUsers();
    } catch (error) {
      toast.error(error?.message || 'User was not archived.');
    } finally {
      setSaving('');
    }
  };

  const restoreUserRecord = async (user) => {
    if (!canManage) {
      toast.error('You do not have permission to manage users.');
      return;
    }
    setSaving(`restore-${getUserId(user)}`);
    try {
      const saved = await restoreUser(getUserId(user));
      setSelectedUser(saved);
      toast.success('User restored');
      await loadUsers();
    } catch (error) {
      toast.error(error?.message || 'User was not restored.');
    } finally {
      setSaving('');
    }
  };

  if (!canView) {
    return (
      <div className="min-w-0">
        <EmptyState message="You do not have permission to view users." />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          {loadError && <p className="mt-1 text-xs font-semibold text-rose-600">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={loadUsers} disabled={loading} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-brand-700 hover:bg-slate-50 disabled:opacity-70">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          {canManage && (
            <button type="button" onClick={() => setModalUser(null)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white">
              <Plus size={16} /> New User
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Users size={20} className="text-brand-500" />} label="Users" loading={loading} value={summary.total} />
        <SummaryCard icon={<UserRound size={20} className="text-brand-500" />} label="Active" loading={loading} value={summary.active} />
        <SummaryCard icon={<Archive size={20} className="text-brand-500" />} label="Archived" loading={loading} value={summary.archived} />
        <SummaryCard icon={<Link2 size={20} className="text-brand-500" />} label="Linked" loading={loading} value={summary.linked} />
      </div>

      <div className="my-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px_180px_150px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-[#f8f9fa] pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500" placeholder="Search users" />
        </div>
        <select value={filters.role} onChange={(event) => updateFilter('role', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm font-semibold text-slate-900">
          <option value="">All roles</option>
          {backendUserRoles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
        </select>
        <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-[#f8f9fa] px-3 text-sm font-semibold text-slate-900">
          <option value="">All status</option>
          {statusOptions.map((status) => <option key={status} value={status}>{roleLabel(status)}</option>)}
        </select>
        <label className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-brand-700">
          <input type="checkbox" checked={filters.includeArchived} onChange={(event) => updateFilter('includeArchived', event.target.checked)} className="h-4 w-4 rounded border-slate-200 text-brand-500" />
          Archived
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <UsersTable
          canManage={canManage}
          loading={loading}
          onArchive={archiveUserRecord}
          onEdit={setModalUser}
          onOpen={openUser}
          onRestore={restoreUserRecord}
          selectedUserId={getUserId(selectedVisibleUser)}
          users={visibleUsers}
        />
        <UserPreview studentMap={studentMap} user={selectedVisibleUser} />
      </div>

      {modalUser !== undefined && (
        <UserModal
          initialUser={modalUser}
          onClose={() => setModalUser(undefined)}
          onSave={saveUser}
          saving={Boolean(saving)}
          students={studentOptions}
        />
      )}
    </div>
  );
}
