import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Briefcase,
  Building2,
  CheckCircle2,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  archivePlacement,
  createPlacement,
  listPlacements,
  restorePlacement,
  updatePlacement,
} from '../../api/placements';
import { canAccess, defaultRoles } from '../userRoles/rolePermissions';

const STATUS_OPTIONS = ['Placed', 'Internship', 'Higher Studies', 'Not Placed', 'Other'];
const PLACEMENT_TYPES = ['Full Time', 'Part Time', 'Internship', 'Contract'];

function hasPermission(user) {
  return ['super-admin', 'admin', 'principal'].includes(user?.roleId)
    || canAccess(defaultRoles, user?.roleId, 'placements.manage');
}

function statusColor(status = '') {
  const s = status.toLowerCase();
  if (s === 'placed' || s === 'full time') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'internship') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (s === 'higher studies') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (s === 'not placed') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function Badge({ value }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(value)}`}>
      {value || '—'}
    </span>
  );
}

function PlacementModal({ initialRecord, onClose, onSave }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    studentName: initialRecord?.studentName || '',
    studentId: initialRecord?.studentId || '',
    rollNumber: initialRecord?.rollNumber || '',
    course: initialRecord?.course || '',
    batch: initialRecord?.batch || '',
    company: initialRecord?.company || '',
    role: initialRecord?.role || '',
    package: initialRecord?.package || '',
    placementType: initialRecord?.placementType || 'Full Time',
    status: initialRecord?.status || 'Placed',
    offerDate: initialRecord?.offerDate || '',
    joiningDate: initialRecord?.joiningDate || '',
    location: initialRecord?.location || '',
    remarks: initialRecord?.remarks || '',
  }));

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.studentName.trim()) { toast.error('Student name is required.'); return; }
    if (!form.company.trim()) { toast.error('Company name is required.'); return; }
    onSave(form);
  };

  const inp = 'w-full h-10 rounded-lg border border-slate-200 bg-[#f8f9fa] px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-brand-700">Placements</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{isEdit ? 'Edit Placement' : 'Add Placement'}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X size={17} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Student Name *</span>
            <input value={form.studentName} onChange={(e) => set('studentName', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Student ID</span>
            <input value={form.studentId} onChange={(e) => set('studentId', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Roll Number</span>
            <input value={form.rollNumber} onChange={(e) => set('rollNumber', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Course / Program</span>
            <input value={form.course} onChange={(e) => set('course', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Batch / Year</span>
            <input value={form.batch} onChange={(e) => set('batch', e.target.value)} className={inp} placeholder="e.g. 2024-2025" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Company *</span>
            <input value={form.company} onChange={(e) => set('company', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Role / Designation</span>
            <input value={form.role} onChange={(e) => set('role', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Package (LPA)</span>
            <input value={form.package} onChange={(e) => set('package', e.target.value)} className={inp} placeholder="e.g. 6.5" />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Placement Type</span>
            <select value={form.placementType} onChange={(e) => set('placementType', e.target.value)} className={inp}>
              {PLACEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Status</span>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inp}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Offer Date</span>
            <input type="date" value={form.offerDate} onChange={(e) => set('offerDate', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Joining Date</span>
            <input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} className={inp} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Location</span>
            <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inp} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-slate-500">Remarks</span>
            <textarea value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${inp} h-20 py-2`} rows={3} />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600">Cancel</button>
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-700 px-5 text-sm font-bold text-white">
            <CheckCircle2 size={16} /> {isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PlacementsManagement({ currentUser }) {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [modalRecord, setModalRecord] = useState(undefined);
  const canManage = hasPermission(currentUser);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listPlacements();
      setPlacements(data);
    } catch {
      toast.error('Could not load placements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const active = placements.filter((p) => p.status !== 'Archived');
  const archived = placements.filter((p) => p.status === 'Archived');
  const visible = statusFilter === 'archived' ? archived : active;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return visible;
    return visible.filter((p) =>
      [p.studentName, p.studentId, p.company, p.role, p.course, p.batch, p.status]
        .some((v) => String(v || '').toLowerCase().includes(term))
    );
  }, [visible, search]);

  const summary = useMemo(() => {
    const placed = active.filter((p) => p.status === 'Placed').length;
    const intern = active.filter((p) => p.status === 'Internship').length;
    const higher = active.filter((p) => p.status === 'Higher Studies').length;
    return { total: active.length, placed, intern, higher };
  }, [active]);

  const save = async (form) => {
    try {
      if (modalRecord?.id) {
        const updated = await updatePlacement(modalRecord.id, form);
        setPlacements((prev) => prev.map((p) => p.id === modalRecord.id ? { ...p, ...(updated || form) } : p));
        toast.success('Placement updated');
      } else {
        const created = await createPlacement(form);
        if (created) setPlacements((prev) => [created, ...prev]);
        toast.success('Placement added');
      }
      setModalRecord(undefined);
    } catch (err) {
      toast.error(err?.message || 'Could not save placement.');
    }
  };

  const archive = async (p) => {
    try {
      await archivePlacement(p.id);
      setPlacements((prev) => prev.map((item) => item.id === p.id ? { ...item, status: 'Archived' } : item));
      toast.success('Placement archived');
    } catch {
      toast.error('Could not archive placement.');
    }
  };

  const restore = async (p) => {
    try {
      await restorePlacement(p.id);
      setPlacements((prev) => prev.map((item) => item.id === p.id ? { ...item, status: 'Placed' } : item));
      toast.success('Placement restored');
    } catch {
      toast.error('Could not restore placement.');
    }
  };

  const STAT_TILES = [
    { label: 'Total Placements', value: summary.total, color: '#2e8c97' },
    { label: 'Placed', value: summary.placed, color: '#2fbf71' },
    { label: 'Internships', value: summary.intern, color: '#a78bfa' },
    { label: 'Higher Studies', value: summary.higher, color: '#f6b26b' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-brand-700 text-white flex items-center justify-center">
            <Briefcase size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Placements</h1>
            <p className="text-sm text-slate-500">Track student placement and internship records.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold flex items-center gap-2">
            <RefreshCcw size={15} /> Refresh
          </button>
          {canManage && (
            <button onClick={() => setModalRecord(null)} className="h-10 px-4 rounded-lg bg-brand-700 text-white text-sm font-bold flex items-center gap-2">
              <Plus size={16} /> Add Placement
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_TILES.map(({ label, value, color }) => (
          <div key={label} className="tt-tile">
            <div className="tt-stat-icon mb-3 [&_svg]:text-white" style={{ background: color }}>
              <Building2 size={18} />
            </div>
            <div className="tt-micro mb-1">{label}</div>
            <div className="text-2xl font-bold text-ink">{loading ? '…' : value}</div>
          </div>
        ))}
      </div>

      <div className="tt-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, company, course, status..."
              className="w-full h-10 rounded-lg border border-slate-200 bg-[#f8f9fa] pl-9 pr-4 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div className="flex gap-2">
            {[['active', 'Active'], ['archived', 'Archived']].map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`h-10 px-4 rounded-lg text-xs font-semibold border ${
                  statusFilter === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Student</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Company / Role</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Course / Batch</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Package</th>
                <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                {canManage && <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-slate-400 text-sm">Loading placements…</td></tr>
              )}
              {!loading && !filtered.length && (
                <tr><td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-slate-400 text-sm">No placements found.</td></tr>
              )}
              {!loading && filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{p.studentName || '—'}</div>
                    <div className="text-xs text-slate-400">{p.studentId || p.rollNumber || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{p.company || '—'}</div>
                    <div className="text-xs text-slate-400">{p.role || ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{p.course || '—'}</div>
                    <div className="text-xs text-slate-400">{p.batch || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {p.package ? `${p.package} LPA` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={p.status} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModalRecord(p)} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          Edit
                        </button>
                        {p.status === 'Archived' ? (
                          <button onClick={() => restore(p)} className="h-8 px-3 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-1">
                            <RotateCcw size={12} /> Restore
                          </button>
                        ) : (
                          <button onClick={() => archive(p)} className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center gap-1">
                            <Archive size={12} /> Archive
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalRecord !== undefined && (
        <PlacementModal
          initialRecord={modalRecord}
          onClose={() => setModalRecord(undefined)}
          onSave={save}
        />
      )}
    </div>
  );
}
