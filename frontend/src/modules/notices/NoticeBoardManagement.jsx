import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FileText,
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
  RefreshCcw,
  Search,
  Send,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { listAcademicResource } from '../../api/academics';
import {
  archiveMessageTemplate,
  archiveNotice,
  createMessageTemplate,
  createNotice,
  listMessageTemplates,
  listNotices,
  sendNotice,
  updateMessageTemplate,
  updateNotice,
} from '../../api/communication';
import {
  communicationAudiences,
  communicationChannels,
  filterNotices,
  filterTemplates,
  formatDisplayDate,
  getNoticeDisplayStatus,
  labelize,
  noticeStatuses,
  summarizeNotices,
  templateStatuses,
  templateTypes,
  validateNoticeForm,
  validateTemplateForm,
} from './noticeUtils';

const ADMIN_ROLES = new Set(['super-admin', 'admin']);
const TABS = [
  { id: 'notices', label: 'Notices', icon: Megaphone },
  { id: 'templates', label: 'Templates', icon: ClipboardList },
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

function classLabel(klass = {}) {
  return [klass.name, klass.courseName].filter(Boolean).join(' - ') || klass.id;
}

function statusClasses(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'published' || normalized === 'active' || normalized === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (normalized === 'draft') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (normalized === 'archived' || normalized === 'inactive') return 'border-slate-200 bg-slate-100 text-slate-600';
  if (normalized === 'expired' || normalized === 'not-configured') return 'border-rose-200 bg-rose-50 text-rose-700';
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

async function optionalLoad(loader, fallback) {
  try {
    return await loader();
  } catch (error) {
    console.warn('Optional communication support data did not load.', error);
    return fallback;
  }
}

function ModalFrame({ children, footer, maxWidth = 'max-w-3xl', onClose, subtitle, title }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#071e27]/50 p-4 backdrop-blur-sm">
      <div className={cx('max-h-[92vh] w-full overflow-hidden rounded-2xl border border-white/35 bg-[#f3faff]/90 shadow-[0_30px_90px_rgba(7,30,39,.22)] backdrop-blur-2xl', maxWidth)}>
        <div className="flex items-start justify-between border-b border-white/35 px-6 py-5">
          <div>
            <p className="text-[11px] font-bold uppercase text-[#006a62]">Communication</p>
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

function NoticeModal({ classes, initialRecord, onClose, onSave, saving }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    title: initialRecord?.title || '',
    message: initialRecord?.message || '',
    audience: initialRecord?.audience || 'all',
    classId: initialRecord?.classId || '',
    className: initialRecord?.className || '',
    sectionId: initialRecord?.sectionId || '',
    attachmentKey: initialRecord?.attachmentKey || '',
    attachmentName: initialRecord?.attachmentName || '',
    publishDate: initialRecord?.publishDate || '',
    expiryDate: initialRecord?.expiryDate || '',
    channels: initialRecord?.channels?.length ? initialRecord.channels : ['app'],
    status: initialRecord?.status || 'draft',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleChannel = (channel) => setForm((current) => {
    const next = new Set(current.channels || []);
    if (next.has(channel)) next.delete(channel);
    else next.add(channel);
    return { ...current, channels: [...next] };
  });
  const updateClass = (classId) => {
    const selectedClass = classes.find((klass) => klass.id === classId);
    setForm((current) => ({ ...current, classId, className: selectedClass ? classLabel(selectedClass) : '' }));
  };
  const submit = (event) => {
    event.preventDefault();
    const payload = compactPayload({
      title: form.title.trim(),
      message: form.message.trim(),
      audience: form.audience,
      classId: form.audience === 'class' ? form.classId : undefined,
      className: form.audience === 'class' ? form.className || undefined : undefined,
      sectionId: form.audience === 'class' ? form.sectionId.trim() || undefined : undefined,
      attachmentKey: form.attachmentKey.trim() || undefined,
      attachmentName: form.attachmentName.trim() || undefined,
      publishDate: form.publishDate || undefined,
      expiryDate: form.expiryDate || undefined,
      channels: form.channels,
      status: isEdit ? form.status : undefined,
    });
    const validationMessage = validateNoticeForm(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Notice' : 'Create Notice'}
        onClose={onClose}
        maxWidth="max-w-4xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid max-h-[68vh] gap-4 overflow-y-auto p-6 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Title *</span>
            <input value={form.title} onChange={(event) => update('title', event.target.value)} className={inputClass} autoFocus />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Message *</span>
            <textarea value={form.message} onChange={(event) => update('message', event.target.value)} rows={5} className={`${inputClass} py-3`} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Audience *</span>
            <select value={form.audience} onChange={(event) => update('audience', event.target.value)} className={inputClass}>
              {communicationAudiences.map((audience) => <option key={audience} value={audience}>{labelize(audience)}</option>)}
            </select>
          </label>
          {form.audience === 'class' && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Class *</span>
              <select value={form.classId} onChange={(event) => updateClass(event.target.value)} className={inputClass}>
                <option value="">Select class</option>
                {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
              </select>
            </label>
          )}
          {form.audience === 'class' && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Section ID</span>
              <input value={form.sectionId} onChange={(event) => update('sectionId', event.target.value)} className={inputClass} />
            </label>
          )}
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Publish Date</span>
            <input type="date" value={form.publishDate} onChange={(event) => update('publishDate', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Expiry Date</span>
            <input type="date" value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} className={inputClass} />
          </label>
          {isEdit && (
            <label>
              <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
              <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
                {noticeStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
              </select>
            </label>
          )}
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Attachment Key</span>
            <input value={form.attachmentKey} onChange={(event) => update('attachmentKey', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Attachment Name</span>
            <input value={form.attachmentName} onChange={(event) => update('attachmentName', event.target.value)} className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-bold text-[#3f4848]">Channels *</span>
            <div className="flex flex-wrap gap-2">
              {communicationChannels.map((channel) => (
                <label key={channel} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/45 px-3 text-xs font-bold text-[#004d4d]">
                  <input type="checkbox" checked={form.channels.includes(channel)} onChange={() => toggleChannel(channel)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
                  {labelize(channel)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </ModalFrame>
    </form>
  );
}

function TemplateModal({ initialRecord, onClose, onSave, saving }) {
  const isEdit = Boolean(initialRecord?.id);
  const [form, setForm] = useState(() => ({
    name: initialRecord?.name || '',
    type: initialRecord?.type || 'sms',
    subject: initialRecord?.subject || '',
    body: initialRecord?.body || '',
    status: initialRecord?.status || 'active',
  }));
  const inputClass = 'w-full min-h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm text-[#071e27] outline-none focus:border-[#006a62] focus:ring-4 focus:ring-[#66d9cc]/20';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const payload = compactPayload({
      name: form.name.trim(),
      type: form.type,
      subject: form.subject.trim() || undefined,
      body: form.body.trim(),
      status: form.status || undefined,
    });
    const validationMessage = validateTemplateForm(payload);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }
    onSave(isEdit ? compactPayload({ name: payload.name, subject: payload.subject, body: payload.body, status: payload.status }) : payload);
  };

  return (
    <form onSubmit={submit}>
      <ModalFrame
        title={isEdit ? 'Edit Template' : 'Create Template'}
        onClose={onClose}
        maxWidth="max-w-3xl"
        footer={(
          <div className="flex justify-end gap-3 border-t border-white/35 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-xl border border-white/50 bg-white/40 px-5 text-sm font-bold text-[#3f4848]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#004d4d] px-5 text-sm font-bold text-white">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Save
            </button>
          </div>
        )}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Name *</span>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={inputClass} autoFocus />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Type *</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)} disabled={isEdit} className={inputClass}>
              {templateTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Subject</span>
            <input value={form.subject} onChange={(event) => update('subject', event.target.value)} className={inputClass} />
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)} className={inputClass}>
              {templateStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold text-[#3f4848]">Body *</span>
            <textarea value={form.body} onChange={(event) => update('body', event.target.value)} rows={6} className={`${inputClass} py-3`} />
          </label>
        </div>
      </ModalFrame>
    </form>
  );
}

function NoticeList({ canCreate, canSend, loading, notices, onArchive, onEdit, onSelect, onSend, selectedNoticeId }) {
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Notices</h2>
        <span className="text-xs font-bold uppercase text-[#3f4848]">{notices.length} listed</span>
      </div>
      <div className="divide-y divide-white/35">
        {loading && <div className="p-8 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading notices...</div>}
        {!loading && notices.map((notice) => (
          <button
            key={notice.id}
            type="button"
            onClick={() => onSelect(notice)}
            className={cx(
              'block w-full p-5 text-left transition hover:bg-white/25',
              selectedNoticeId === notice.id ? 'bg-white/35' : ''
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(getNoticeDisplayStatus(notice)))}>{getNoticeDisplayStatus(notice)}</span>
                  <span className="rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#3f4848]">{labelize(notice.audience)}</span>
                  {(notice.channels || []).map((channel) => <span key={channel} className="rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#3f4848]">{labelize(channel)}</span>)}
                </div>
                <h3 className="mt-3 text-base font-bold text-[#003434]">{notice.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#3f4848]">{notice.message}</p>
                <p className="mt-2 text-xs font-semibold text-[#3f4848]">Publish {formatDisplayDate(notice.publishDate)} | Expiry {formatDisplayDate(notice.expiryDate)}</p>
              </div>
              {(canCreate || canSend) && (
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {canCreate && <span onClick={(event) => { event.stopPropagation(); onEdit(notice); }} className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Edit3 size={13} /> Edit</span>}
                  {canSend && <span onClick={(event) => { event.stopPropagation(); onSend(notice); }} className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Send size={13} /> Send</span>}
                  {canCreate && <span onClick={(event) => { event.stopPropagation(); onArchive(notice); }} className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Archive size={13} /> Archive</span>}
                </div>
              )}
            </div>
          </button>
        ))}
        {!loading && !notices.length && <div className="p-5"><EmptyState message="No notices found." /></div>}
      </div>
    </section>
  );
}

function NoticePreview({ notice }) {
  return (
    <section className="erp-glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#003434]">Preview</h2>
        {notice && <span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(getNoticeDisplayStatus(notice)))}>{getNoticeDisplayStatus(notice)}</span>}
      </div>
      {!notice ? (
        <div className="mt-5"><EmptyState message="Select a notice to preview it." /></div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-[#3f4848]">{labelize(notice.audience)} audience</p>
            <h3 className="mt-2 text-xl font-bold text-[#003434]">{notice.title}</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-[#3f4848]">{notice.message}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/40 p-3 text-sm"><span className="font-bold text-[#3f4848]">Class</span><br /><b className="text-[#071e27]">{valueOrDash(notice.className || notice.classId)}</b></div>
            <div className="rounded-xl bg-white/40 p-3 text-sm"><span className="font-bold text-[#3f4848]">Attachment</span><br /><b className="text-[#071e27]">{valueOrDash(notice.attachmentName || notice.attachmentKey)}</b></div>
            <div className="rounded-xl bg-white/40 p-3 text-sm"><span className="font-bold text-[#3f4848]">Created</span><br /><b className="text-[#071e27]">{formatDisplayDate(notice.createdAt)}</b></div>
            <div className="rounded-xl bg-white/40 p-3 text-sm"><span className="font-bold text-[#3f4848]">Published</span><br /><b className="text-[#071e27]">{formatDisplayDate(notice.publishedAt || notice.publishDate)}</b></div>
          </div>
          {notice.attachmentUrl && (
            <a href={notice.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-xs font-bold text-white">
              <FileText size={14} /> Open Attachment
            </a>
          )}
          <div>
            <h3 className="mb-2 text-sm font-bold text-[#003434]">Delivery Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(notice.deliveryStatus || {}).map(([channel, status]) => (
                <span key={channel} className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(status))}>{labelize(channel)}: {labelize(status)}</span>
              ))}
              {!Object.keys(notice.deliveryStatus || {}).length && <span className="rounded-full bg-white/45 px-3 py-1 text-[11px] font-bold uppercase text-[#3f4848]">Not sent</span>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TemplateTable({ canCreate, loading, onArchive, onEdit, templates }) {
  return (
    <section className="erp-glass-card overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/35 px-5 py-4">
        <h2 className="text-sm font-bold text-[#003434]">Message Templates</h2>
        <span className="text-xs font-bold uppercase text-[#3f4848]">{templates.length} listed</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[#004d4d] text-left text-white">
            <tr>
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Subject</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="px-5 py-10 text-center text-sm font-semibold text-[#3f4848]"><Loader2 className="mr-2 inline animate-spin" size={16} /> Loading templates...</td></tr>}
            {!loading && templates.map((template) => (
              <tr key={template.id}>
                <td className="px-5 py-4">
                  <p className="font-bold text-[#071e27]">{template.name}</p>
                  <p className="line-clamp-1 text-xs text-[#3f4848]">{template.body}</p>
                </td>
                <td className="px-5 py-4 text-[#3f4848]">{labelize(template.type)}</td>
                <td className="px-5 py-4 text-[#3f4848]">{valueOrDash(template.subject)}</td>
                <td className="px-5 py-4"><span className={cx('rounded-full border px-3 py-1 text-[11px] font-bold uppercase', statusClasses(template.status || 'active'))}>{labelize(template.status || 'active')}</span></td>
                <td className="px-5 py-4">
                  {canCreate && (
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(template)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Edit3 size={13} /> Edit</button>
                      <button type="button" onClick={() => onArchive(template)} className="inline-flex h-8 items-center gap-2 rounded-lg bg-white/55 px-3 text-xs font-bold text-[#004d4d]"><Archive size={13} /> Archive</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !templates.length && <tr><td colSpan="5" className="px-5 py-12"><EmptyState message="No templates found." /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function NoticeBoardManagement({
  academicYear = '',
  currentUser,
  selectedCourse = null,
  selectedCourseCode = 'all',
}) {
  const [activeTab, setActiveTab] = useState('notices');
  const [notices, setNotices] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState('');
  const [noticeFilters, setNoticeFilters] = useState({ search: '', audience: '', status: '', classId: '', includeArchived: false });
  const [templateFilters, setTemplateFilters] = useState({ search: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [loadError, setLoadError] = useState('');
  const [noticeModalRecord, setNoticeModalRecord] = useState(undefined);
  const [templateModalRecord, setTemplateModalRecord] = useState(undefined);

  const canView = hasPermission(currentUser, 'communication.view');
  const canCreate = hasPermission(currentUser, 'communication.create');
  const canSend = hasPermission(currentUser, 'communication.send') || canCreate;
  const effectiveAcademicYear = academicYear || selectedCourse?.academicYear || '';
  const effectiveCourseId = selectedCourse?.id || (selectedCourseCode !== 'all' ? selectedCourseCode : '');

  const loadCommunication = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [nextNotices, nextTemplates, nextClasses] = await Promise.all([
        listNotices({
          audience: noticeFilters.audience,
          status: noticeFilters.status,
          classId: noticeFilters.classId,
          includeArchived: noticeFilters.includeArchived ? 'true' : '',
        }),
        listMessageTemplates({ type: templateFilters.type }),
        optionalLoad(() => listAcademicResource('classes', { academicYear: effectiveAcademicYear, courseId: effectiveCourseId, status: 'active' }), []),
      ]);
      setNotices(nextNotices);
      setTemplates(nextTemplates);
      setClasses(activeItems(nextClasses));
      setSelectedNoticeId((current) => current || nextNotices[0]?.id || '');
      setLoadError('');
    } catch (error) {
      console.error('Unable to load backend communication data.', error);
      setLoadError(error?.message || 'Unable to load communication data from the backend.');
    } finally {
      setLoading(false);
    }
  }, [canView, effectiveAcademicYear, effectiveCourseId, noticeFilters.audience, noticeFilters.classId, noticeFilters.includeArchived, noticeFilters.status, templateFilters.type]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadCommunication();
    });
    return () => {
      active = false;
    };
  }, [loadCommunication]);

  const visibleNotices = useMemo(() => filterNotices(notices, noticeFilters), [noticeFilters, notices]);
  const visibleTemplates = useMemo(() => filterTemplates(templates, templateFilters), [templateFilters, templates]);
  const selectedNotice = useMemo(() => visibleNotices.find((notice) => notice.id === selectedNoticeId) || visibleNotices[0] || null, [selectedNoticeId, visibleNotices]);
  const summary = useMemo(() => summarizeNotices(notices), [notices]);
  const sentCount = notices.filter((notice) => Object.values(notice.deliveryStatus || {}).some((status) => status === 'sent' || status === 'not-configured')).length;

  const updateNoticeFilter = (key, value) => setNoticeFilters((current) => ({ ...current, [key]: value }));
  const updateTemplateFilter = (key, value) => setTemplateFilters((current) => ({ ...current, [key]: value }));

  const saveNoticeRecord = async (payload) => {
    if (!canCreate) {
      toast.error('You do not have permission to create notices.');
      return;
    }
    const isEdit = Boolean(noticeModalRecord?.id);
    setSaving('notice');
    try {
      const saved = await (isEdit ? updateNotice(noticeModalRecord.id, payload) : createNotice(payload));
      setNoticeModalRecord(undefined);
      setSelectedNoticeId(saved.id);
      toast.success(isEdit ? 'Notice updated' : 'Notice created');
      await loadCommunication();
    } catch (error) {
      toast.error(error?.message || 'Notice was not saved.');
    } finally {
      setSaving('');
    }
  };

  const sendNoticeRecord = async (notice) => {
    if (!canSend) {
      toast.error('You do not have permission to send notices.');
      return;
    }
    setSaving(`send-${notice.id}`);
    try {
      const result = await sendNotice(notice.id);
      setSelectedNoticeId(result.notice?.id || notice.id);
      toast.success('Notice send recorded');
      await loadCommunication();
    } catch (error) {
      toast.error(error?.message || 'Notice was not sent.');
    } finally {
      setSaving('');
    }
  };

  const archiveNoticeRecord = async (notice) => {
    if (!canCreate) {
      toast.error('You do not have permission to archive notices.');
      return;
    }
    if (!window.confirm(`Archive ${notice.title}?`)) return;
    setSaving(`archive-${notice.id}`);
    try {
      await archiveNotice(notice.id);
      toast.success('Notice archived');
      await loadCommunication();
    } catch (error) {
      toast.error(error?.message || 'Notice was not archived.');
    } finally {
      setSaving('');
    }
  };

  const saveTemplateRecord = async (payload) => {
    if (!canCreate) {
      toast.error('You do not have permission to create templates.');
      return;
    }
    const isEdit = Boolean(templateModalRecord?.id);
    setSaving('template');
    try {
      await (isEdit ? updateMessageTemplate(templateModalRecord.id, payload) : createMessageTemplate(payload));
      setTemplateModalRecord(undefined);
      toast.success(isEdit ? 'Template updated' : 'Template created');
      await loadCommunication();
    } catch (error) {
      toast.error(error?.message || 'Template was not saved.');
    } finally {
      setSaving('');
    }
  };

  const archiveTemplateRecord = async (template) => {
    if (!canCreate) {
      toast.error('You do not have permission to archive templates.');
      return;
    }
    if (!window.confirm(`Archive ${template.name}?`)) return;
    setSaving(`template-${template.id}`);
    try {
      await archiveMessageTemplate(template.id);
      toast.success('Template archived');
      await loadCommunication();
    } catch (error) {
      toast.error(error?.message || 'Template was not archived.');
    } finally {
      setSaving('');
    }
  };

  if (!canView) {
    return (
      <div className="erp-communication-page">
        <EmptyState message="You do not have permission to view communication." />
      </div>
    );
  }

  return (
    <div className="erp-communication-page">
      <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-[#006a62]">Communication Hub</p>
          <h1 className="mt-1 font-['Montserrat'] text-3xl font-bold text-[#003434]">Communications & Notices</h1>
          <p className="mt-2 text-sm font-semibold text-[#3f4848]">Campus notices and message templates.</p>
          {loadError && <p className="mt-2 text-xs font-semibold text-rose-700">{loadError}</p>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={loadCommunication} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/45 px-4 text-sm font-bold text-[#004d4d]">
            <RefreshCcw size={16} /> Refresh
          </button>
          {canCreate && (
            <button type="button" onClick={() => (activeTab === 'templates' ? setTemplateModalRecord(null) : setNoticeModalRecord(null))} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#004d4d] px-4 text-sm font-bold text-white">
              <Plus size={16} /> {activeTab === 'templates' ? 'Create Template' : 'Create Notice'}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<Megaphone size={20} className="text-[#006a62]" />} label="Notices" loading={loading} value={summary.total} />
        <SummaryCard icon={<BadgeCheck size={20} className="text-[#006a62]" />} label="Published" loading={loading} value={summary.published} />
        <SummaryCard icon={<Send size={20} className="text-[#006a62]" />} label="Send Records" loading={loading} value={sentCount} />
        <SummaryCard icon={<MessageCircle size={20} className="text-[#006a62]" />} label="Templates" loading={loading} value={templates.length} />
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
                activeTab === tab.id ? 'bg-[#004d4d] text-white shadow-[0_12px_28px_rgba(0,77,77,.18)]' : 'bg-white/45 text-[#004d4d]'
              )}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'notices' && (
        <>
          <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_220px_150px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={16} />
              <input value={noticeFilters.search} onChange={(event) => updateNoticeFilter('search', event.target.value)} className="h-11 w-full rounded-full border border-white/40 bg-white/45 pl-10 pr-4 text-sm font-semibold text-[#071e27] outline-none" placeholder="Search notices" />
            </div>
            <select value={noticeFilters.audience} onChange={(event) => updateNoticeFilter('audience', event.target.value)} className="h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm font-semibold text-[#071e27]">
              <option value="">All audiences</option>
              {communicationAudiences.map((audience) => <option key={audience} value={audience}>{labelize(audience)}</option>)}
            </select>
            <select value={noticeFilters.status} onChange={(event) => updateNoticeFilter('status', event.target.value)} className="h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm font-semibold text-[#071e27]">
              <option value="">All status</option>
              {noticeStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
            </select>
            <select value={noticeFilters.classId} onChange={(event) => updateNoticeFilter('classId', event.target.value)} className="h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm font-semibold text-[#071e27]">
              <option value="">All classes</option>
              {classes.map((klass) => <option key={klass.id} value={klass.id}>{classLabel(klass)}</option>)}
            </select>
            <label className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/45 px-3 text-xs font-bold text-[#004d4d]">
              <input type="checkbox" checked={noticeFilters.includeArchived} onChange={(event) => updateNoticeFilter('includeArchived', event.target.checked)} className="h-4 w-4 rounded border-white/50 text-[#006a62]" />
              Archived
            </label>
          </div>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <NoticeList
              canCreate={canCreate}
              canSend={canSend}
              loading={loading}
              notices={visibleNotices}
              onArchive={archiveNoticeRecord}
              onEdit={setNoticeModalRecord}
              onSelect={(notice) => setSelectedNoticeId(notice.id)}
              onSend={sendNoticeRecord}
              selectedNoticeId={selectedNotice?.id}
            />
            <NoticePreview notice={selectedNotice} />
          </div>
        </>
      )}

      {activeTab === 'templates' && (
        <>
          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(220px,1fr)_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6f7978]" size={16} />
              <input value={templateFilters.search} onChange={(event) => updateTemplateFilter('search', event.target.value)} className="h-11 w-full rounded-full border border-white/40 bg-white/45 pl-10 pr-4 text-sm font-semibold text-[#071e27] outline-none" placeholder="Search templates" />
            </div>
            <select value={templateFilters.type} onChange={(event) => updateTemplateFilter('type', event.target.value)} className="h-11 rounded-xl border border-white/40 bg-white/45 px-3 text-sm font-semibold text-[#071e27]">
              <option value="">All types</option>
              {templateTypes.map((type) => <option key={type} value={type}>{labelize(type)}</option>)}
            </select>
          </div>
          <TemplateTable canCreate={canCreate} loading={loading} onArchive={archiveTemplateRecord} onEdit={setTemplateModalRecord} templates={visibleTemplates} />
        </>
      )}

      {noticeModalRecord !== undefined && (
        <NoticeModal
          classes={classes}
          initialRecord={noticeModalRecord}
          onClose={() => setNoticeModalRecord(undefined)}
          onSave={saveNoticeRecord}
          saving={saving === 'notice'}
        />
      )}

      {templateModalRecord !== undefined && (
        <TemplateModal
          initialRecord={templateModalRecord}
          onClose={() => setTemplateModalRecord(undefined)}
          onSave={saveTemplateRecord}
          saving={saving === 'template'}
        />
      )}
    </div>
  );
}
