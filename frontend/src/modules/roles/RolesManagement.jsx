import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Layers3,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getPermissionCatalog, listRoles, resetRolePermissions, updateRolePermissions } from '../../api/roles';
import {
  countDraftGroupPermissions,
  countRoleGroupPermissions,
  filterRoles,
  groupPermissions,
  hasRoleOverride,
  permissionAction,
  samePermissionSet,
  sortPermissions,
  summarizeRoles,
  togglePermission,
  validatePermissionSet,
} from './roleUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const textInputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20 disabled:cursor-not-allowed disabled:opacity-70';

function hasPermission(user, permission) {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return ADMIN_ROLES.has(user?.roleId) || ADMIN_ROLES.has(user?.role) || permissions.includes(permission);
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'customized') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'default') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-[#81f3e5]/60 bg-[#81f3e5]/35 text-[#006f66]';
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

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-[#bfc8c8] bg-white/35 p-8 text-center text-sm font-semibold text-[#3f4848]">
      {message}
    </div>
  );
}

function RoleStatusBadge({ role }) {
  const label = hasRoleOverride(role) ? 'Customized' : 'Default';
  return (
    <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(label))}>
      {label}
    </span>
  );
}

function RoleList({ catalog, loading, roles, selectedRoleId, onSelect }) {
  const groups = groupPermissions(catalog);
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Roles</h2>
        <span className="text-xs font-bold uppercase text-[#3f4848]">{roles.length} listed</span>
      </div>
      <div className="max-h-[680px] overflow-y-auto p-3">
        {loading && (
          <div className="px-3 py-8 text-center text-sm font-semibold text-[#3f4848]">
            <Loader2 className="mr-2 inline animate-spin" size={16} /> Loading roles...
          </div>
        )}
        {!loading && roles.map((role) => {
          const selected = selectedRoleId === role.id;
          return (
            <button
              type="button"
              key={role.id}
              onClick={() => onSelect(role.id)}
              className={cx(
                'mb-3 w-full rounded-2xl border p-4 text-left transition',
                selected ? 'border-[#006a62] bg-white/60 shadow-[0_18px_42px_rgba(7,30,39,.12)]' : 'border-white/35 bg-white/35 hover:bg-white/50'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-[#003434]">{role.label || role.id}</h3>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#3f4848]">{role.description || '-'}</p>
                </div>
                <RoleStatusBadge role={role} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-[#3f4848]">
                <div className="rounded-xl bg-white/45 p-3">
                  <span className="block text-[10px] uppercase">Permissions</span>
                  <b className="mt-1 block text-lg text-[#003434]">{(role.permissions || []).length}</b>
                </div>
                <div className="rounded-xl bg-white/45 p-3">
                  <span className="block text-[10px] uppercase">Default</span>
                  <b className="mt-1 block text-lg text-[#003434]">{(role.defaultPermissions || []).length}</b>
                </div>
              </div>
              {!!groups.length && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {groups.slice(0, 4).map((group) => (
                    <span key={group.id} className="rounded-full bg-white/45 px-2 py-1 text-[10px] font-bold uppercase text-[#006a62]">
                      {countRoleGroupPermissions(role, group.permissions)}/{group.permissions.length}
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
        {!loading && !roles.length && <EmptyState message="No roles found." />}
      </div>
    </section>
  );
}

function PermissionRow({ checked, disabled, permission, onToggle }) {
  return (
    <label className={cx(
      'flex min-h-14 items-center gap-3 rounded-xl bg-white/40 px-3 py-2 text-sm font-semibold text-[#3f4848]',
      disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:bg-white/55'
    )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(permission)}
        disabled={disabled}
        className="h-4 w-4 rounded border-white/50 text-[#006a62]"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-[#071e27]">{permissionAction(permission)}</span>
        <span className="block truncate text-xs text-[#3f4848]">{permission}</span>
      </span>
    </label>
  );
}

function PermissionGroup({ disabled, draftPermissions, group, onToggle }) {
  const selectedCount = countDraftGroupPermissions(draftPermissions, group.permissions);
  const draftSet = new Set(draftPermissions || []);
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-white/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#003434]">{group.label}</h3>
          <p className="mt-1 text-xs font-semibold text-[#3f4848]">{selectedCount} of {group.permissions.length} enabled</p>
        </div>
        <span className="w-fit rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#006a62]">
          {group.id}
        </span>
      </div>
      <div className="grid gap-2 p-4 md:grid-cols-2">
        {group.permissions.map((permission) => (
          <PermissionRow
            key={permission}
            checked={draftSet.has(permission)}
            disabled={disabled}
            permission={permission}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}

function RoleDetail({ canManage, catalog, draftPermissions, loading, role, saving, onReset, onSave, onToggle }) {
  const groups = groupPermissions(catalog);
  const totalPermissions = Array.isArray(catalog.all) ? catalog.all.length : 0;
  const dirty = role ? !samePermissionSet(draftPermissions, role.permissions || []) : false;
  const validationMessage = validatePermissionSet(draftPermissions, catalog);
  const completion = totalPermissions ? Math.round((draftPermissions.length / totalPermissions) * 100) : 0;

  if (!role) {
    return (
      <section className="erp-glass-card rounded-2xl p-5">
        <EmptyState message={loading ? 'Loading role permissions...' : 'Select a role to edit permissions.'} />
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="erp-glass-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Permission Editor</p>
            <h2 className="mt-1 font-['Montserrat'] text-2xl font-bold text-[#003434]">{role.label || role.id}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-[#3f4848]">{role.description || '-'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RoleStatusBadge role={role} />
            <span className="rounded-full border border-[#81f3e5]/60 bg-[#81f3e5]/35 px-3 py-1 text-[11px] font-bold uppercase text-[#006f66]">
              {draftPermissions.length}/{totalPermissions} enabled
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/40 p-4">
            <span className="text-[11px] font-bold uppercase text-[#3f4848]">Current Set</span>
            <b className="mt-2 block text-2xl text-[#003434]">{draftPermissions.length}</b>
          </div>
          <div className="rounded-2xl bg-white/40 p-4">
            <span className="text-[11px] font-bold uppercase text-[#3f4848]">Default Set</span>
            <b className="mt-2 block text-2xl text-[#003434]">{(role.defaultPermissions || []).length}</b>
          </div>
          <div className="rounded-2xl bg-white/40 p-4">
            <span className="text-[11px] font-bold uppercase text-[#3f4848]">Catalog Coverage</span>
            <b className="mt-2 block text-2xl text-[#003434]">{completion}%</b>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/40">
          <div className="h-full rounded-full bg-[#006a62]" style={{ width: `${completion}%` }} />
        </div>

        {validationMessage && <p className="mt-3 text-xs font-semibold text-rose-700">{validationMessage}</p>}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            disabled={!canManage || Boolean(saving) || !hasRoleOverride(role)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === 'reset' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Reset
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!canManage || Boolean(saving) || !dirty || Boolean(validationMessage)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === 'save' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
          </button>
        </div>
      </section>

      {!canManage && (
        <div className="rounded-2xl border border-white/35 bg-white/35 p-4 text-sm font-semibold text-[#3f4848]">
          You can view role permissions. Saving changes requires roles.manage.
        </div>
      )}

      {groups.map((group) => (
        <PermissionGroup
          key={group.id}
          disabled={!canManage || Boolean(saving)}
          draftPermissions={draftPermissions}
          group={group}
          onToggle={onToggle}
        />
      ))}
      {!groups.length && <EmptyState message="No permission catalog groups available." />}
    </div>
  );
}

export default function RolesManagement({ currentUser }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({ groups: {}, all: [] });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');

  const canView = hasPermission(currentUser, 'roles.view');
  const canManage = hasPermission(currentUser, 'roles.manage');

  const loadRoles = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextRoles, nextCatalog] = await Promise.all([
        listRoles(),
        getPermissionCatalog(),
      ]);
      setRoles(nextRoles);
      setCatalog(nextCatalog);
      setSelectedRoleId((current) => {
        if (current && nextRoles.some((role) => role.id === current)) return current;
        return nextRoles[0]?.id || '';
      });
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend roles.', error);
      setLoadError(error?.message || 'Unable to load roles from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadRoles();
    });
    return () => {
      active = false;
    };
  }, [loadRoles]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || roles[0] || null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setDraftPermissions(sortPermissions(selectedRole?.permissions || []));
    });
    return () => {
      active = false;
    };
  }, [selectedRole]);

  const visibleRoles = useMemo(() => filterRoles(roles, search), [roles, search]);
  const summary = useMemo(() => summarizeRoles(roles, catalog), [catalog, roles]);

  const toggleDraftPermission = (permission) => {
    setDraftPermissions((current) => togglePermission(current, permission));
  };

  const savePermissions = async () => {
    if (!selectedRole || !canManage) {
      toast.error('You do not have permission to manage roles.');
      return;
    }
    const validationMessage = validatePermissionSet(draftPermissions, catalog);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    setSaving('save');
    try {
      const response = await updateRolePermissions(selectedRole.id, sortPermissions(draftPermissions));
      const nextPermissions = sortPermissions(response.permissions || []);
      setRoles((current) => current.map((role) => (
        role.id === response.role ? { ...role, permissions: nextPermissions } : role
      )));
      setDraftPermissions(nextPermissions);
      toast.success('Role permissions saved');
    } catch (error) {
      toast.error(error?.message || 'Role permissions were not saved.');
    } finally {
      setSaving('');
    }
  };

  const resetPermissions = async () => {
    if (!selectedRole || !canManage) {
      toast.error('You do not have permission to manage roles.');
      return;
    }
    if (!window.confirm(`Reset ${selectedRole.label || selectedRole.id} to default permissions?`)) return;
    setSaving('reset');
    try {
      const response = await resetRolePermissions(selectedRole.id);
      const nextPermissions = sortPermissions(response.permissions || []);
      setRoles((current) => current.map((role) => (
        role.id === response.role ? { ...role, permissions: nextPermissions } : role
      )));
      setDraftPermissions(nextPermissions);
      toast.success('Role permissions reset');
    } catch (error) {
      toast.error(error?.message || 'Role permissions were not reset.');
    } finally {
      setSaving('');
    }
  };

  if (!canView) {
    return (
      <div className="erp-roles-page">
        <EmptyState message="You do not have permission to view roles." />
      </div>
    );
  }

  return (
    <div className="erp-roles-page">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#006a62]">Admin Setup</p>
          <h1 className="mt-1 font-['Montserrat'] text-3xl font-bold text-[#003434]">Roles</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">ERP role permissions and default permission sets.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>}
        </div>
        <button
          type="button"
          onClick={loadRoles}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d] disabled:opacity-70"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<ShieldCheck size={20} className="text-[#006a62]" />} label="Roles" loading={loading} value={summary.roles} />
        <SummaryCard icon={<SlidersHorizontal size={20} className="text-[#006a62]" />} label="Customized" loading={loading} value={summary.customized} />
        <SummaryCard icon={<BadgeCheck size={20} className="text-[#006a62]" />} label="Defaults" loading={loading} value={summary.defaults} />
        <SummaryCard icon={<Layers3 size={20} className="text-[#006a62]" />} label="Permissions" loading={loading} value={summary.permissions} />
      </div>

      <div className="my-5">
        <div className="relative max-w-2xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={cx(textInputClass, 'rounded-full pl-10 pr-4 font-semibold')}
            placeholder="Search roles or permissions"
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <RoleList
          catalog={catalog}
          loading={loading}
          roles={visibleRoles}
          selectedRoleId={selectedRole?.id || ''}
          onSelect={setSelectedRoleId}
        />
        <RoleDetail
          canManage={canManage}
          catalog={catalog}
          draftPermissions={draftPermissions}
          loading={loading}
          role={selectedRole}
          saving={saving}
          onReset={resetPermissions}
          onSave={savePermissions}
          onToggle={toggleDraftPermission}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-white/35 bg-white/35 p-4 text-xs font-semibold text-[#3f4848]">
        Catalog loaded: {catalog.all?.length || 0} permissions across {groupPermissions(catalog).length} groups.
      </div>
    </div>
  );
}
