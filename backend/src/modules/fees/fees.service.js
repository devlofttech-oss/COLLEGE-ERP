// Fees (Spec §7.5): fee heads, class/course-wise structure with installments,
// student assignment, collection (full/partial) with discount + fine, receipts,
// payment history, dues reporting and reminders. Online payment is a hook that
// activates only when a gateway is configured.

import { db, admin } from '../../config/firebase.js';
import { repo } from '../../utils/firestore.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { ApiError } from '../../utils/ApiError.js';
import { recordAudit } from '../../services/audit.service.js';

const feeHeads = repo('feeHeads');
const feeStructures = repo('feeStructures');
const feeAssignments = repo('feeAssignments');
const feePayments = repo('feePayments');

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Online', 'Cheque', 'NetBanking'];

function generateReceiptNumber() {
  return `REC-${Date.now().toString().slice(-8)}`;
}

// ── Fee heads ──
export const listHeads = (q = {}) => feeHeads.list({ where: q.academicYear ? [['academicYear', '==', q.academicYear]] : [], orderBy: { field: 'name' } });
export async function createHead(data, actor) {
  requireFields(data, ['name']);
  return feeHeads.create(pick(data, ['name', 'academicYear', 'description', 'status']), { actor });
}
export const updateHead = (id, data, actor) => feeHeads.update(id, pick(data, ['name', 'academicYear', 'description', 'status']), { actor });
export const archiveHead = (id, actor) => feeHeads.archive(id, { actor });

// ── Fee structures ──
export async function listStructures(q = {}) {
  const where = [];
  ['academicYear', 'classId', 'feeHeadId'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  return feeStructures.list({ where, orderBy: { field: 'createdAt', direction: 'desc' } });
}
export async function createStructure(data, actor) {
  requireFields(data, ['feeHeadId', 'academicYear', 'amount']);
  const head = await feeHeads.getById(data.feeHeadId);
  return feeStructures.create({
    ...pick(data, ['feeHeadId', 'academicYear', 'classId', 'className', 'installment', 'amount', 'dueDate', 'status']),
    feeHeadName: head?.name || data.feeHeadName || null,
    amount: Number(data.amount) || 0,
  }, { actor });
}
export const updateStructure = (id, data, actor) => feeStructures.update(id, pick(data, ['installment', 'amount', 'dueDate', 'status', 'className']), { actor });
export const archiveStructure = (id, actor) => feeStructures.archive(id, { actor });

// ── Assignments (student-wise fee) ──
export async function listAssignments(q = {}) {
  const where = [];
  ['studentId', 'academicYear', 'classId', 'status'].forEach((f) => { if (q[f]) where.push([f, '==', q[f]]); });
  return feeAssignments.list({ where, includeArchived: true, orderBy: { field: 'createdAt', direction: 'desc' } });
}

export async function assignFee(data, actor) {
  requireFields(data, ['studentId', 'amount']);
  const amount = Number(data.amount) || 0;
  return feeAssignments.create({
    ...pick(data, ['studentId', 'studentName', 'feeStructureId', 'feeHeadName', 'academicYear', 'classId', 'installment', 'dueDate']),
    amount,
    paidAmount: 0, discountTotal: 0, fineTotal: 0, balance: amount,
    status: 'pending',
  }, { actor });
}

function computeStatus(assignment) {
  const balance = (assignment.amount + assignment.fineTotal) - assignment.paidAmount - assignment.discountTotal;
  let status = 'pending';
  if (balance <= 0) status = 'paid';
  else if (assignment.paidAmount > 0 || assignment.discountTotal > 0) status = 'partial';
  return { balance: Math.max(0, balance), status };
}

// ── Collect payment ──
export async function collectFee(body, actor) {
  requireFields(body, ['studentId', 'amount', 'paymentMode']);
  oneOf(body.paymentMode, PAYMENT_MODES, 'paymentMode');
  const amount = Number(body.amount) || 0;
  const discount = Number(body.discount) || 0;
  const fine = Number(body.fine) || 0;
  if (amount <= 0 && discount <= 0) throw ApiError.badRequest('Payment amount must be greater than zero.');

  const receiptNumber = generateReceiptNumber();
  let assignmentSnapshot = null;

  if (body.assignmentId) {
    const a = await feeAssignments.getByIdOrFail(body.assignmentId);
    const updated = {
      paidAmount: (a.paidAmount || 0) + amount,
      discountTotal: (a.discountTotal || 0) + discount,
      fineTotal: (a.fineTotal || 0) + fine,
      amount: a.amount || 0,
    };
    const { balance, status } = computeStatus(updated);
    assignmentSnapshot = await feeAssignments.update(body.assignmentId, { ...updated, balance, status }, { actor });
  }

  const payment = await feePayments.create({
    studentId: body.studentId,
    studentName: body.studentName || assignmentSnapshot?.studentName || null,
    assignmentId: body.assignmentId || null,
    feeHeadName: body.feeHeadName || assignmentSnapshot?.feeHeadName || null,
    receiptNumber,
    amount, discount, fine,
    paymentMode: body.paymentMode,
    referenceNumber: body.referenceNumber || null,
    remarks: body.remarks || null,
    collectedBy: actor?.uid || null,
    collectedByName: actor?.email || null,
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { actor });

  recordAudit({ action: 'fees.collect', entity: 'fee', entityId: payment.id, actor, meta: { studentId: body.studentId, amount, receiptNumber } });
  return { receiptNumber, payment, assignment: assignmentSnapshot };
}

export async function paymentHistory(q = {}) {
  const where = [];
  if (q.studentId) where.push(['studentId', '==', q.studentId]);
  return feePayments.list({ where, includeArchived: true, orderBy: { field: 'createdAt', direction: 'desc' } });
}

export async function getReceipt(paymentId) {
  const p = await feePayments.getByIdOrFail(paymentId);
  return p; // receipt PDF rendered by PDF service later; data payload for now.
}

// ── Dues ──
export async function duesReport(q = {}) {
  const where = [['status', 'in', ['pending', 'partial']]];
  if (q.classId) where.push(['classId', '==', q.classId]);
  if (q.academicYear) where.push(['academicYear', '==', q.academicYear]);
  const list = await feeAssignments.list({ where, includeArchived: false });
  const totalDue = list.reduce((sum, a) => sum + (a.balance || 0), 0);
  return { count: list.length, totalDue, assignments: list };
}

// ── Reminders (channel send is a Communication concern; here we log intent) ──
export async function sendReminders(body, actor) {
  requireFields(body, ['assignmentIds']);
  recordAudit({ action: 'fees.remind', entity: 'fee', actor, meta: { count: body.assignmentIds.length, channel: body.channel || 'app' } });
  return { queued: body.assignmentIds.length, channel: body.channel || 'app', note: 'Reminder intent recorded. Actual SMS/WhatsApp/app delivery runs when the channel integration is enabled.' };
}

// ── Online payment gateway hook (activates when configured) ──
export async function createPaymentOrder() {
  throw new ApiError(503, 'Online payment gateway is not configured. Enable Razorpay/Cashfree/PhonePe keys in settings to accept online payments.');
}

export { PAYMENT_MODES };
