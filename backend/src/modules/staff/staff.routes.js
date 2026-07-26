import { Router } from 'express';
import * as service from './staff.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const staffRouter = Router();
staffRouter.use(requireAuth);

const VIEW = requirePermission('staff.view');
const CREATE = requirePermission('staff.create');
const EDIT = requirePermission('staff.edit');
const ARCHIVE = requirePermission('staff.archive');

// Departments (declare before /:id).
staffRouter.get('/departments', VIEW, asyncHandler(async (req, res) => {
  res.json({ departments: await service.listDepartments() });
}));
staffRouter.post('/departments', CREATE, asyncHandler(async (req, res) => {
  res.status(201).json({ department: await service.createDepartment(req.body || {}, req.user) });
}));
staffRouter.patch('/departments/:id', EDIT, asyncHandler(async (req, res) => {
  res.json({ department: await service.updateDepartment(req.params.id, req.body || {}, req.user) });
}));
staffRouter.post('/departments/:id/archive', ARCHIVE, asyncHandler(async (req, res) => {
  res.json({ department: await service.archiveDepartment(req.params.id, req.user) });
}));

// Staff.
staffRouter.get('/', VIEW, asyncHandler(async (req, res) => {
  const staff = await service.listStaff(req.query);
  res.json({ staff, count: staff.length });
}));
staffRouter.post('/', CREATE, asyncHandler(async (req, res) => {
  res.status(201).json({ staff: await service.createStaff(req.body || {}, req.user) });
}));

// Documents + login (nested, before /:id core).
staffRouter.get('/:id/documents', VIEW, asyncHandler(async (req, res) => {
  res.json({ documents: await service.listDocuments(req.params.id) });
}));
staffRouter.post('/:id/documents', EDIT, asyncHandler(async (req, res) => {
  res.status(201).json({ document: await service.addDocument(req.params.id, req.body || {}, req.user) });
}));
staffRouter.post('/:id/documents/:docId/verify', EDIT, asyncHandler(async (req, res) => {
  res.json({ document: await service.setDocumentStatus(req.params.docId, 'verified', req.body?.remarks, req.user) });
}));
staffRouter.post('/:id/documents/:docId/reject', EDIT, asyncHandler(async (req, res) => {
  res.json({ document: await service.setDocumentStatus(req.params.docId, 'rejected', req.body?.remarks, req.user) });
}));
staffRouter.post('/:id/create-login', CREATE, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createLogin(req.params.id, req.body || {}, req.user));
}));

// Core record.
staffRouter.get('/:id', VIEW, asyncHandler(async (req, res) => {
  res.json({ staff: await service.getStaff(req.params.id) });
}));
staffRouter.patch('/:id', EDIT, asyncHandler(async (req, res) => {
  res.json({ staff: await service.updateStaff(req.params.id, req.body || {}, req.user) });
}));
staffRouter.post('/:id/archive', ARCHIVE, asyncHandler(async (req, res) => {
  res.json({ staff: await service.archiveStaff(req.params.id, req.user) });
}));
staffRouter.post('/:id/restore', ARCHIVE, asyncHandler(async (req, res) => {
  res.json({ staff: await service.restoreStaff(req.params.id, req.user) });
}));
