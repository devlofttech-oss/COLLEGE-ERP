import { useEffect, useState } from 'react';
import {
  Building2,
  CheckSquare,
  ChevronDown,
  GraduationCap,
  Loader2,
  LogOut,
  Plus,
  Settings2,
  Square,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PasswordInput } from '../../components/ui';
import {
  createInstitution,
  listInstitutions,
  setInstitutionModules,
  updateInstitution,
} from '../../api/institutions';

const ALL_MODULES = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'students',     label: 'Students' },
  { id: 'admissions',   label: 'Admissions' },
  { id: 'attendance',   label: 'Attendance' },
  { id: 'fees',         label: 'Fees & Payments' },
  { id: 'academics',    label: 'Academics' },
  { id: 'timetable',    label: 'Timetable' },
  { id: 'examinations', label: 'Examinations' },
  { id: 'results',      label: 'Results' },
  { id: 'staff',        label: 'Faculty & Staff' },
  { id: 'communication',label: 'Communication' },
  { id: 'reports',      label: 'Reports' },
  { id: 'settings',     label: 'Settings' },
  { id: 'placements',   label: 'Placements' },
];

const STANDARD = ['dashboard','students','admissions','attendance','fees','academics','timetable','examinations','results','staff','communication','reports','settings'];

const STATUS_COLORS = {
  active:    { bg: '#e6faf2', text: '#1a7a4a' },
  suspended: { bg: '#fff0ef', text: '#c0392b' },
  setup:     { bg: '#fef9ec', text: '#b07d00' },
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function StatusBadge({ status }) {
  const s = status || 'setup';
  const c = STATUS_COLORS[s] || STATUS_COLORS.setup;
  return (
    <span style={{ background: c.bg, color: c.text }}
      className="inline-block px-3 py-1 rounded-full text-[11px] font-700 uppercase tracking-wide">
      {s}
    </span>
  );
}

function ModuleToggle({ id, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      className="flex items-center gap-2 text-left w-full px-3 py-2.5 rounded-xl transition-colors"
      style={{ background: checked ? '#eaf7f4' : '#f5f9f9' }}
    >
      {checked
        ? <CheckSquare size={16} className="shrink-0" style={{ color: '#1b6b74' }} />
        : <Square size={16} className="shrink-0 text-[#9fb0b5]" />}
      <span className="text-[13px] font-medium" style={{ color: checked ? '#123138' : '#8ca0a6' }}>
        {label}
      </span>
    </button>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(11,58,66,0.45)' }}>
      <div
        className="w-full bg-white rounded-3xl shadow-2xl flex flex-col max-h-[92vh]"
        style={{ maxWidth: wide ? 680 : 520 }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#eef3f3] shrink-0">
          <span className="text-[17px] font-700 text-[#123138]">{title}</span>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-[#f4f8f8] transition-colors"
            style={{ color: '#8ca0a6' }}>
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-7 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] font-600 text-[#33474d] mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#f1726b] mt-1">{error}</p>}
    </div>
  );
}

const inputCls = 'w-full h-11 px-4 rounded-xl border border-[#e4eded] bg-[#f5f9f9] text-[13px] text-[#123138] outline-none focus:border-[#2e8c97] focus:ring-2 focus:ring-[#2e8c97]/10 transition-all';
const selectCls = `${inputCls} cursor-pointer`;

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', slug: '', contactEmail: '', contactPhone: '', status: 'active',
    adminName: '', adminEmail: '', adminPassword: '',
  });
  const [modules, setModules] = useState(new Set(STANDARD));
  const [slugManual, setSlugManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleName = (v) => {
    set('name', v);
    if (!slugManual) set('slug', slugify(v));
  };

  const toggleModule = (id) => {
    setModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (form.adminEmail && !form.adminPassword) e.adminPassword = 'Password required if email is set.';
    if (form.adminPassword && form.adminPassword.length < 8) e.adminPassword = 'Minimum 8 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
        status: form.status,
        enabledModules: [...modules],
      };
      if (form.adminEmail.trim()) {
        body.admin = {
          email: form.adminEmail.trim(),
          password: form.adminPassword,
          name: form.adminName.trim() || 'Institution Admin',
        };
      }
      const result = await createInstitution(body);
      toast.success(`Institution "${form.name}" created.`);
      onCreated(result);
    } catch (err) {
      toast.error(err?.message || 'Failed to create institution.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Institution" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-x-5">
        <div className="col-span-2">
          <Field label="Institution Name *" error={errors.name}>
            <input className={inputCls} value={form.name} onChange={e => handleName(e.target.value)} placeholder="e.g. St. Xavier's College" />
          </Field>
        </div>
        <Field label="Slug (URL key)">
          <input className={inputCls} value={form.slug}
            onChange={e => { setSlugManual(true); set('slug', e.target.value); }}
            placeholder="st-xaviers-college" />
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="setup">Setup</option>
            <option value="suspended">Suspended</option>
          </select>
        </Field>
        <Field label="Contact Email">
          <input className={inputCls} type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="admin@college.edu" />
        </Field>
        <Field label="Contact Phone">
          <input className={inputCls} type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+91 98765 43210" />
        </Field>
      </div>

      <div className="mb-5">
        <p className="text-[12px] font-600 text-[#33474d] mb-3 uppercase tracking-wide">Enabled Modules</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_MODULES.map(m => (
            <ModuleToggle key={m.id} id={m.id} label={m.label} checked={modules.has(m.id)} onChange={toggleModule} />
          ))}
        </div>
      </div>

      <div className="border-t border-[#eef3f3] pt-5 mb-2">
        <p className="text-[13px] font-600 text-[#123138] mb-4">First Admin Login <span className="font-400 text-[#8ca0a6]">(optional)</span></p>
        <div className="grid grid-cols-2 gap-x-5">
          <div className="col-span-2">
            <Field label="Admin Name">
              <input className={inputCls} value={form.adminName} onChange={e => set('adminName', e.target.value)} placeholder="Institution Admin" />
            </Field>
          </div>
          <Field label="Admin Email" error={errors.adminEmail}>
            <input className={inputCls} type="email" value={form.adminEmail} onChange={e => set('adminEmail', e.target.value)} placeholder="admin@college.edu" />
          </Field>
          <Field label="Admin Password" error={errors.adminPassword}>
            <PasswordInput className={inputCls} value={form.adminPassword} onChange={e => set('adminPassword', e.target.value)} placeholder="Min. 8 characters" />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#eef3f3]">
        <button type="button" onClick={onClose}
          className="h-10 px-5 rounded-full text-[13px] font-600 border border-[#e4eded] text-[#33474d] hover:bg-[#f5f9f9] transition-colors">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={saving}
          className="h-10 px-6 rounded-full text-[13px] font-600 text-white flex items-center gap-2 transition-all hover:-translate-y-px disabled:opacity-60"
          style={{ background: '#1b6b74' }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Create Institution
        </button>
      </div>
    </Modal>
  );
}

function ModulesModal({ institution, onClose, onSaved }) {
  const [modules, setModules] = useState(new Set(institution.enabledModules || STANDARD));
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setModules(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const save = async () => {
    setSaving(true);
    try {
      const result = await setInstitutionModules(institution.id, [...modules]);
      toast.success('Modules updated.');
      onSaved(result.institution || { ...institution, enabledModules: [...modules] });
    } catch (err) {
      toast.error(err?.message || 'Failed to update modules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Modules — ${institution.name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {ALL_MODULES.map(m => (
          <ModuleToggle key={m.id} id={m.id} label={m.label} checked={modules.has(m.id)} onChange={toggle} />
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#eef3f3]">
        <button type="button" onClick={onClose}
          className="h-10 px-5 rounded-full text-[13px] font-600 border border-[#e4eded] text-[#33474d] hover:bg-[#f5f9f9] transition-colors">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="h-10 px-6 rounded-full text-[13px] font-600 text-white flex items-center gap-2 hover:-translate-y-px transition-all disabled:opacity-60"
          style={{ background: '#1b6b74' }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Modules
        </button>
      </div>
    </Modal>
  );
}

function EditModal({ institution, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: institution.name || '',
    contactEmail: institution.contactEmail || '',
    contactPhone: institution.contactPhone || '',
    status: institution.status || 'active',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      const updated = await updateInstitution(institution.id, form);
      toast.success('Institution updated.');
      onSaved(updated);
    } catch (err) {
      toast.error(err?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit — ${institution.name}`} onClose={onClose}>
      <Field label="Institution Name *">
        <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
      </Field>
      <Field label="Status">
        <select className={selectCls} value={form.status} onChange={e => set('status', e.target.value)}>
          <option value="active">Active</option>
          <option value="setup">Setup</option>
          <option value="suspended">Suspended</option>
        </select>
      </Field>
      <Field label="Contact Email">
        <input className={inputCls} type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} />
      </Field>
      <Field label="Contact Phone">
        <input className={inputCls} type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} />
      </Field>
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#eef3f3]">
        <button type="button" onClick={onClose}
          className="h-10 px-5 rounded-full text-[13px] font-600 border border-[#e4eded] text-[#33474d] hover:bg-[#f5f9f9] transition-colors">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="h-10 px-6 rounded-full text-[13px] font-600 text-white flex items-center gap-2 hover:-translate-y-px transition-all disabled:opacity-60"
          style={{ background: '#1b6b74' }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

export default function SuperAdminConsole({ user, onLogout }) {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingModules, setEditingModules] = useState(null);
  const [editingDetails, setEditingDetails] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    listInstitutions()
      .then(setInstitutions)
      .catch(() => toast.error('Failed to load institutions.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = ({ institution }) => {
    setInstitutions(prev => [institution, ...prev]);
    setShowCreate(false);
  };

  const handleModulesSaved = (updated) => {
    setInstitutions(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingModules(null);
  };

  const handleDetailsSaved = (updated) => {
    setInstitutions(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingDetails(null);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#dcefe8 0%,#e4ecf3 45%,#e9e4f6 100%)', backgroundAttachment: 'fixed' }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(180deg,#0f4a52 0%,#0d363d 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white grid place-items-center" style={{ color: '#0f4a52' }}>
            <GraduationCap size={20} />
          </div>
          <div>
            <div className="text-[11px] font-600 text-[#7fc0c6] uppercase tracking-widest">Devloft Technologies</div>
            <div className="text-[16px] font-700 text-white leading-tight">Super Admin Console</div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen(o => !o)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-full border border-white/20 hover:border-white/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full grid place-items-center text-white font-700 text-[12px]"
              style={{ background: '#1b6b74' }}>
              {(user?.name || 'S')[0].toUpperCase()}
            </div>
            <span className="text-[13px] font-600 text-white">{user?.name || 'Super Admin'}</span>
            <ChevronDown size={14} className="text-white/60" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl py-2 z-50"
              style={{ boxShadow: '0 12px 30px -14px rgba(16,50,60,.28)' }}>
              <div className="px-4 py-3 border-b border-[#eef3f3]">
                <div className="text-[13px] font-600 text-[#123138]">{user?.name || 'Super Admin'}</div>
                <div className="text-[11px] text-[#8ca0a6] mt-0.5">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={() => { setProfileOpen(false); onLogout(); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-[13px] font-500 text-[#33474d] hover:bg-[#f4f8f8] hover:text-[#f1726b] transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Institutions', value: institutions.length },
            { label: 'Active', value: institutions.filter(i => i.status === 'active').length },
            { label: 'Setup / Suspended', value: institutions.filter(i => i.status !== 'active').length },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 8px 22px -14px rgba(16,50,60,.16)' }}>
              <div className="text-[11px] font-600 uppercase tracking-widest text-[#9fb0b5] mb-2">{s.label}</div>
              <div className="text-[32px] font-700 text-[#123138] leading-none">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Institutions card */}
        <div className="bg-white rounded-3xl" style={{ boxShadow: '0 12px 30px -14px rgba(16,50,60,.18)' }}>
          <div className="flex items-center justify-between px-7 py-5 border-b border-[#eef3f3]">
            <span className="text-[16px] font-700 text-[#123138]">Institutions</span>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 h-9 px-5 rounded-full text-[13px] font-600 text-white transition-all hover:-translate-y-px"
              style={{ background: '#1b6b74' }}
            >
              <Plus size={15} />
              New Institution
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-[#8ca0a6]">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-[14px]">Loading…</span>
            </div>
          ) : institutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl grid place-items-center" style={{ background: '#eaf1f1', color: '#1b6b74' }}>
                <Building2 size={28} />
              </div>
              <div className="text-center">
                <div className="text-[15px] font-600 text-[#123138]">No institutions yet</div>
                <div className="text-[13px] text-[#8ca0a6] mt-1">Create your first client institution to get started.</div>
              </div>
              <button type="button" onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 h-9 px-5 rounded-full text-[13px] font-600 text-white"
                style={{ background: '#1b6b74' }}>
                <Plus size={15} /> New Institution
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#eef3f3]">
                    {['Institution', 'Status', 'Contact', 'Modules', 'Actions'].map(h => (
                      <th key={h} className="text-left px-7 py-3 text-[11px] font-700 uppercase tracking-widest text-[#9fb0b5]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst, idx) => (
                    <tr key={inst.id}
                      className="border-b border-[#f5f9f9] last:border-0 hover:bg-[#fafcfc] transition-colors">
                      <td className="px-7 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                            style={{ background: '#eaf1f1', color: '#1b6b74' }}>
                            <Building2 size={16} />
                          </div>
                          <div>
                            <div className="text-[14px] font-600 text-[#123138]">{inst.name}</div>
                            {inst.slug && <div className="text-[11px] text-[#9fb0b5]">{inst.slug}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-4">
                        <StatusBadge status={inst.status} />
                      </td>
                      <td className="px-7 py-4">
                        <div className="text-[13px] text-[#33474d]">{inst.contactEmail || '—'}</div>
                        {inst.contactPhone && <div className="text-[11px] text-[#9fb0b5]">{inst.contactPhone}</div>}
                      </td>
                      <td className="px-7 py-4">
                        <span className="text-[13px] font-600 text-[#1b6b74]">
                          {(inst.enabledModules || []).length}
                        </span>
                        <span className="text-[12px] text-[#9fb0b5]"> / {ALL_MODULES.length}</span>
                      </td>
                      <td className="px-7 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingModules(inst)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-600 border border-[#e4eded] text-[#1b6b74] hover:bg-[#eaf7f4] transition-colors"
                          >
                            <CheckSquare size={13} /> Modules
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDetails(inst)}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-600 border border-[#e4eded] text-[#33474d] hover:bg-[#f5f9f9] transition-colors"
                          >
                            <Settings2 size={13} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editingModules && <ModulesModal institution={editingModules} onClose={() => setEditingModules(null)} onSaved={handleModulesSaved} />}
      {editingDetails && <EditModal institution={editingDetails} onClose={() => setEditingDetails(null)} onSaved={handleDetailsSaved} />}

      {(showCreate || editingModules || editingDetails || profileOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => { setProfileOpen(false); }} />
      )}
    </div>
  );
}
