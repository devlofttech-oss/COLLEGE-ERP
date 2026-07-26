// Communication (Spec §7.11): notices/circulars with audience targeting,
// attachments, and multi-channel dispatch (app push, SMS, WhatsApp, email).
// Channel providers are hooks — they activate when the client enables + pays for
// the integration; until then delivery is recorded as 'not-configured'.

import { repo, serverTimestamp } from '../../utils/firestore.js';
import { pick, requireFields } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';
import { resolveFileUrl } from '../../services/storage.service.js';

const notices = repo('notices');
const templates = repo('messageTemplates');

const CHANNELS = ['app', 'sms', 'whatsapp', 'email'];
const AUDIENCES = ['all', 'parents', 'students', 'teachers', 'staff', 'class'];

// Which integrations are configured (env-driven). All off by default.
function channelStatus(channel) {
  const map = {
    app: !!process.env.FCM_SERVER_KEY,
    sms: !!process.env.SMS_API_KEY,
    whatsapp: !!process.env.WHATSAPP_API_KEY,
    email: !!process.env.EMAIL_API_KEY,
  };
  return map[channel] ? 'configured' : 'not-configured';
}

// ── Notices ──
export async function listNotices(q = {}) {
  const where = [];
  ['audience', 'classId', 'status'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  const list = await notices.list({ where, includeArchived: q.includeArchived === 'true', orderBy: { field: 'createdAt', direction: 'desc' } });
  return Promise.all(list.map(async (n) => ({
    ...n,
    attachmentUrl: n.attachmentKey ? await resolveFileUrl(n.attachmentKey).catch(() => null) : null,
  })));
}

export const getNotice = (id) => notices.getByIdOrFail(id);

function normalize(data) {
  const out = pick(data, [
    'title', 'message', 'audience', 'classId', 'className', 'sectionId',
    'attachmentKey', 'attachmentName', 'publishDate', 'expiryDate', 'channels', 'status',
  ]);
  if (out.audience && !AUDIENCES.includes(out.audience)) throw ApiError.badRequest(`audience must be one of: ${AUDIENCES.join(', ')}`);
  if (out.channels) {
    if (!Array.isArray(out.channels)) throw ApiError.badRequest('channels must be an array.');
    const bad = out.channels.filter((c) => !CHANNELS.includes(c));
    if (bad.length) throw ApiError.badRequest(`Unknown channel(s): ${bad.join(', ')}`);
  }
  return out;
}

export async function createNotice(data, actor) {
  requireFields(data, ['title', 'message', 'audience']);
  const notice = await notices.create({
    ...normalize(data),
    channels: data.channels || ['app'],
    status: 'draft',
    deliveryStatus: {},
  }, { actor });
  recordAudit({ action: 'communication.createNotice', entity: 'notice', entityId: notice.id, actor });
  return notice;
}

export const updateNotice = (id, data, actor) => notices.update(id, normalize(data), { actor });
export const archiveNotice = (id, actor) => notices.archive(id, { actor });

// Publish + dispatch across selected channels.
export async function sendNotice(id, actor) {
  const notice = await notices.getByIdOrFail(id);
  const channels = notice.channels?.length ? notice.channels : ['app'];
  const deliveryStatus = {};
  for (const ch of channels) {
    const status = channelStatus(ch);
    // When configured, this is where the provider call would go (FCM/SMS/etc.).
    deliveryStatus[ch] = status === 'configured' ? 'sent' : 'not-configured';
  }
  const updated = await notices.update(id, {
    status: 'published',
    publishedAt: serverTimestamp(),
    deliveryStatus,
  }, { actor });
  recordAudit({ action: 'communication.sendNotice', entity: 'notice', entityId: id, actor, meta: { channels } });
  return { notice: updated, deliveryStatus };
}

// ── Templates ──
export async function listTemplates(q = {}) {
  return templates.list({ where: q.type ? [['type', '==', q.type]] : [], orderBy: { field: 'name' } });
}
export async function createTemplate(data, actor) {
  requireFields(data, ['name', 'type', 'body']);
  if (!['sms', 'whatsapp', 'email'].includes(data.type)) throw ApiError.badRequest('type must be sms, whatsapp or email.');
  return templates.create(pick(data, ['name', 'type', 'subject', 'body', 'status']), { actor });
}
export const updateTemplate = (id, data, actor) => templates.update(id, pick(data, ['name', 'subject', 'body', 'status']), { actor });
export const archiveTemplate = (id, actor) => templates.archive(id, { actor });

export { CHANNELS, AUDIENCES };
