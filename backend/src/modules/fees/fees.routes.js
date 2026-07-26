import { Router } from 'express';
import * as service from './fees.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateReceipt } from '../../services/pdf.service.js';
import { getInstitution } from '../settings/settings.service.js';

export const feesRouter = Router();
feesRouter.use(requireAuth);

const VIEW = requirePermission('fees.view');
const STRUCTURE = requirePermission('fees.structure');
const COLLECT = requirePermission('fees.collect');
const RECEIPT = requirePermission('fees.receipt', 'fees.view');
const REPORT = requirePermission('fees.report', 'fees.view');
const REMIND = requirePermission('fees.remind', 'fees.collect');

// Heads
feesRouter.get('/heads', VIEW, asyncHandler(async (req, res) => res.json({ heads: await service.listHeads(req.query) })));
feesRouter.post('/heads', STRUCTURE, asyncHandler(async (req, res) => res.status(201).json({ head: await service.createHead(req.body || {}, req.user) })));
feesRouter.patch('/heads/:id', STRUCTURE, asyncHandler(async (req, res) => res.json({ head: await service.updateHead(req.params.id, req.body || {}, req.user) })));
feesRouter.post('/heads/:id/archive', STRUCTURE, asyncHandler(async (req, res) => res.json({ head: await service.archiveHead(req.params.id, req.user) })));

// Structures
feesRouter.get('/structures', VIEW, asyncHandler(async (req, res) => res.json({ structures: await service.listStructures(req.query) })));
feesRouter.post('/structures', STRUCTURE, asyncHandler(async (req, res) => res.status(201).json({ structure: await service.createStructure(req.body || {}, req.user) })));
feesRouter.patch('/structures/:id', STRUCTURE, asyncHandler(async (req, res) => res.json({ structure: await service.updateStructure(req.params.id, req.body || {}, req.user) })));
feesRouter.post('/structures/:id/archive', STRUCTURE, asyncHandler(async (req, res) => res.json({ structure: await service.archiveStructure(req.params.id, req.user) })));

// Assignments
feesRouter.get('/assignments', VIEW, asyncHandler(async (req, res) => res.json({ assignments: await service.listAssignments(req.query) })));
feesRouter.post('/assignments', STRUCTURE, asyncHandler(async (req, res) => res.status(201).json({ assignment: await service.assignFee(req.body || {}, req.user) })));

// Collection + receipts + history
feesRouter.post('/collect', COLLECT, asyncHandler(async (req, res) => res.status(201).json(await service.collectFee(req.body || {}, req.user))));
feesRouter.get('/payments', RECEIPT, asyncHandler(async (req, res) => res.json({ payments: await service.paymentHistory(req.query) })));
feesRouter.get('/receipts/:paymentId', RECEIPT, asyncHandler(async (req, res) => res.json({ receipt: await service.getReceipt(req.params.paymentId) })));
feesRouter.get('/receipts/:paymentId/pdf', RECEIPT, asyncHandler(async (req, res) => {
  const [payment, institution] = await Promise.all([service.getReceipt(req.params.paymentId), getInstitution().catch(() => ({}))]);
  const pdf = await generateReceipt(payment, institution);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="receipt-${payment.receiptNumber || req.params.paymentId}.pdf"`);
  res.send(pdf);
}));

// Dues + reminders
feesRouter.get('/dues', REPORT, asyncHandler(async (req, res) => res.json(await service.duesReport(req.query))));
feesRouter.post('/remind', REMIND, asyncHandler(async (req, res) => res.json(await service.sendReminders(req.body || {}, req.user))));

// Online payment (hook)
feesRouter.post('/pay/order', VIEW, asyncHandler(async (req, res) => res.json(await service.createPaymentOrder(req.body || {}, req.user))));
