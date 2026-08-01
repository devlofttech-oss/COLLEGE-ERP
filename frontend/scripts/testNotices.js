import assert from 'node:assert/strict';
import {
  communicationAudiences,
  communicationChannels,
  filterNotices,
  filterTemplates,
  formatDisplayDate,
  getNoticeDisplayStatus,
  isExpired,
  isPublished,
  labelize,
  summarizeNotices,
  templateTypes,
  validateNoticeForm,
  validateTemplateForm,
} from '../src/modules/notices/noticeUtils.js';

const now = new Date('2026-06-19T10:00:00');
const notices = [
  {
    id: 'n1',
    title: 'Published notice',
    message: 'Library hours are extended.',
    audience: 'students',
    classId: '',
    className: '',
    attachmentName: 'library.pdf',
    publishDate: '2026-06-18',
    expiryDate: '2026-06-30',
    channels: ['app', 'email'],
    status: 'published',
  },
  {
    id: 'n2',
    title: 'Class notice',
    message: 'Class XII seminar.',
    audience: 'class',
    classId: 'class-xii-a',
    className: 'Class XII - A',
    publishDate: '2026-06-20',
    expiryDate: '',
    channels: ['app'],
    status: 'draft',
  },
  {
    id: 'n3',
    title: 'Old notice',
    message: 'Past circular.',
    audience: 'parents',
    classId: '',
    publishDate: '2026-06-01',
    expiryDate: '2026-06-10',
    channels: ['whatsapp'],
    status: 'published',
  },
];

const templates = [
  { id: 't1', name: 'Fee Reminder', type: 'sms', body: 'Please pay fees.', status: 'active' },
  { id: 't2', name: 'Exam Notice', type: 'email', subject: 'Exam', body: 'Exam starts Monday.', status: 'active' },
  { id: 't3', name: 'Transport Update', type: 'whatsapp', body: 'Bus route changed.', status: 'inactive' },
];

assert.equal(communicationAudiences.includes('parents'), true);
assert.equal(communicationChannels.includes('whatsapp'), true);
assert.equal(templateTypes.includes('email'), true);

assert.equal(isPublished(notices[0]), true);
assert.equal(isPublished(notices[1]), false);
assert.equal(isExpired(notices[2], now), true);
assert.equal(getNoticeDisplayStatus(notices[0], now), 'Published');
assert.equal(getNoticeDisplayStatus(notices[1], now), 'Draft');
assert.equal(getNoticeDisplayStatus(notices[2], now), 'Expired');
assert.equal(formatDisplayDate('2026-06-18'), '18 Jun 2026');
assert.equal(labelize('not-configured'), 'Not Configured');

assert.deepEqual(summarizeNotices(notices, now), {
  total: 3,
  published: 1,
  drafts: 1,
  expired: 1,
  classTargeted: 1,
});

assert.deepEqual(filterNotices(notices, { audience: 'students' }).map((notice) => notice.id), ['n1']);
assert.deepEqual(filterNotices(notices, { status: 'draft' }).map((notice) => notice.id), ['n2']);
assert.deepEqual(filterNotices(notices, { classId: 'class-xii-a' }).map((notice) => notice.id), ['n2']);
assert.deepEqual(filterNotices(notices, { search: 'library' }).map((notice) => notice.id), ['n1']);
assert.deepEqual(filterTemplates(templates, { type: 'email' }).map((template) => template.id), ['t2']);
assert.deepEqual(filterTemplates(templates, { search: 'bus' }).map((template) => template.id), ['t3']);

assert.equal(validateNoticeForm({}), 'Title is required.');
assert.equal(validateNoticeForm({ title: 'Notice', message: '', audience: 'all' }), 'Message is required.');
assert.equal(validateNoticeForm({ title: 'Notice', message: 'Body', audience: 'bad', channels: ['app'] }), 'Audience is required.');
assert.equal(validateNoticeForm({ title: 'Notice', message: 'Body', audience: 'class', channels: ['app'] }), 'Class is required for class audience.');
assert.equal(validateNoticeForm({ title: 'Notice', message: 'Body', audience: 'all', channels: ['fax'] }), 'Channels must be app, sms, whatsapp, or email.');
assert.equal(validateNoticeForm({
  title: 'Notice',
  message: 'Body',
  audience: 'all',
  publishDate: '2026-06-20',
  expiryDate: '2026-06-19',
  channels: ['app'],
}), 'Expiry date cannot be before publish date.');
assert.equal(validateNoticeForm({
  title: 'Notice',
  message: 'Body',
  audience: 'all',
  channels: ['app'],
}), '');

assert.equal(validateTemplateForm({}), 'Template name is required.');
assert.equal(validateTemplateForm({ name: 'Reminder', type: 'push', body: 'Body' }), 'Template type must be sms, whatsapp, or email.');
assert.equal(validateTemplateForm({ name: 'Reminder', type: 'sms', body: '' }), 'Template body is required.');
assert.equal(validateTemplateForm({ name: 'Reminder', type: 'sms', body: 'Body' }), '');

console.log('Notice tests passed.');
