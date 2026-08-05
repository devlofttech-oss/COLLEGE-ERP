import { Router } from 'express';
import * as ctrl from './students.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/requireModule.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { idCardData } from './students.service.js';
import { generateIdCard } from '../../services/pdf.service.js';
import { getInstitution } from '../settings/settings.service.js';

export const studentsRouter = Router();
studentsRouter.use(requireAuth, requireModule('students'));

const VIEW = requirePermission('students.view');
const CREATE = requirePermission('students.create');
const EDIT = requirePermission('students.edit');
const ARCHIVE = requirePermission('students.archive');
const EXPORT = requirePermission('students.export');
const IMPORT = requirePermission('students.import');
const PROMOTE = requirePermission('students.promote');
const IDCARD = requirePermission('students.idcard');

// Static/collection routes before :id routes.
studentsRouter.get('/', VIEW, ctrl.list);
studentsRouter.get('/export', EXPORT, ctrl.exportCsv);
studentsRouter.post('/', CREATE, ctrl.create);
studentsRouter.post('/import', IMPORT, ctrl.bulkImport);

// Documents (nested).
studentsRouter.get('/:id/documents', VIEW, ctrl.listDocuments);
studentsRouter.post('/:id/documents', EDIT, ctrl.addDocument);
studentsRouter.post('/:id/documents/:docId/verify', EDIT, ctrl.verifyDocument);
studentsRouter.post('/:id/documents/:docId/reject', EDIT, ctrl.rejectDocument);

// Placement.
studentsRouter.get('/:id/placement-history', VIEW, ctrl.placementHistory);
studentsRouter.post('/:id/promote', PROMOTE, ctrl.promote);
studentsRouter.post('/:id/transfer', PROMOTE, ctrl.transfer);

// ID card.
studentsRouter.get('/:id/id-card', IDCARD, ctrl.idCard);
studentsRouter.get('/:id/id-card/pdf', IDCARD, asyncHandler(async (req, res) => {
  const [card, institution] = await Promise.all([idCardData(req.params.id), getInstitution().catch(() => ({}))]);
  const pdf = await generateIdCard(card, institution);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="id-card-${req.params.id}.pdf"`);
  res.send(pdf);
}));

// Core record.
studentsRouter.get('/:id', VIEW, ctrl.get);
studentsRouter.patch('/:id', EDIT, ctrl.update);
studentsRouter.post('/:id/archive', ARCHIVE, ctrl.archive);
studentsRouter.post('/:id/restore', ARCHIVE, ctrl.restore);
