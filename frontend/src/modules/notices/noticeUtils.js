export const communicationAudiences = ['all', 'parents', 'students', 'teachers', 'staff', 'class'];
export const communicationChannels = ['app', 'sms', 'whatsapp', 'email'];
export const templateTypes = ['sms', 'whatsapp', 'email'];
export const noticeStatuses = ['draft', 'published'];
export const templateStatuses = ['active', 'inactive'];

export function formatDisplayDate(value = new Date()) {
  if (!value) return '-';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(value);
  }
  if (typeof value === 'string') {
    const parsed = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : formatDisplayDate(parsed);
  }
  if (value?._seconds) return formatDisplayDate(new Date(value._seconds * 1000));
  if (value?.seconds) return formatDisplayDate(new Date(value.seconds * 1000));
  return String(value);
}

export function labelize(value = '') {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-';
}

export function isPublished(item = {}) {
  return String(item.status || '').toLowerCase() === 'published';
}

export function isExpired(item = {}, now = new Date()) {
  if (!item.expiryDate) return false;
  const expiresAt = new Date(`${item.expiryDate}T23:59:59`);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt < now;
}

export function getNoticeDisplayStatus(item = {}, now = new Date()) {
  if (item.archived || String(item.status || '').toLowerCase() === 'archived') return 'Archived';
  if (isExpired(item, now)) return 'Expired';
  if (isPublished(item)) return 'Published';
  return 'Draft';
}

export function summarizeNotices(items = [], now = new Date()) {
  return items.reduce((summary, item) => {
    const status = getNoticeDisplayStatus(item, now);
    return {
      total: summary.total + 1,
      published: summary.published + (status === 'Published' ? 1 : 0),
      drafts: summary.drafts + (status === 'Draft' ? 1 : 0),
      expired: summary.expired + (status === 'Expired' ? 1 : 0),
      classTargeted: summary.classTargeted + (item.audience === 'class' ? 1 : 0),
    };
  }, {
    total: 0,
    published: 0,
    drafts: 0,
    expired: 0,
    classTargeted: 0,
  });
}

export function filterNotices(items = [], filters = {}) {
  const term = (filters.search || '').trim().toLowerCase();
  return items.filter((item) => {
    const audienceMatches = !filters.audience || item.audience === filters.audience;
    const statusMatches = !filters.status || item.status === filters.status;
    const classMatches = !filters.classId || item.classId === filters.classId;
    const textMatches = !term || [item.title, item.message, item.className, item.attachmentName]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
    return audienceMatches && statusMatches && classMatches && textMatches;
  });
}

export function filterTemplates(items = [], filters = {}) {
  const term = (filters.search || '').trim().toLowerCase();
  return items.filter((item) => {
    const typeMatches = !filters.type || item.type === filters.type;
    const textMatches = !term || [item.name, item.type, item.subject, item.body]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
    return typeMatches && textMatches;
  });
}

export function validateNoticeForm(form = {}) {
  if (!form.title?.trim()) return 'Title is required.';
  if (!form.message?.trim()) return 'Message is required.';
  if (!communicationAudiences.includes(form.audience)) return 'Audience is required.';
  if (form.audience === 'class' && !form.classId) return 'Class is required for class audience.';
  if (form.channels && (!Array.isArray(form.channels) || !form.channels.length)) return 'At least one channel is required.';
  const unknownChannel = (form.channels || []).find((channel) => !communicationChannels.includes(channel));
  if (unknownChannel) return 'Channels must be app, sms, whatsapp, or email.';
  if (form.expiryDate && form.publishDate && form.expiryDate < form.publishDate) return 'Expiry date cannot be before publish date.';
  return '';
}

export function validateTemplateForm(form = {}) {
  if (!form.name?.trim()) return 'Template name is required.';
  if (!templateTypes.includes(form.type)) return 'Template type must be sms, whatsapp, or email.';
  if (!form.body?.trim()) return 'Template body is required.';
  return '';
}
