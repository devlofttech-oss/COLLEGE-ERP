import { Router } from 'express';
import * as service from './admissions.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/requireModule.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const admissionsRouter = Router();
admissionsRouter.use(requireAuth, requireModule('admissions'));

const VIEW = requirePermission('admissions.view');
const CREATE = requirePermission('admissions.create');
const EDIT = requirePermission('admissions.edit');
const APPROVE = requirePermission('admissions.approve');
const CONVERT = requirePermission('admissions.convert');

admissionsRouter.get('/', VIEW, asyncHandler(async (req, res) => {
  const admissions = await service.listAdmissions(req.query);
  res.json({ admissions, count: admissions.length });
}));
admissionsRouter.post('/', CREATE, asyncHandler(async (req, res) => {
  res.status(201).json({ admission: await service.createEnquiry(req.body || {}, req.user) });
}));
admissionsRouter.get('/:id', VIEW, asyncHandler(async (req, res) => {
  res.json({ admission: await service.getAdmission(req.params.id) });
}));
admissionsRouter.patch('/:id', EDIT, asyncHandler(async (req, res) => {
  res.json({ admission: await service.updateAdmission(req.params.id, req.body || {}, req.user) });
}));

admissionsRouter.get('/:id/followups', VIEW, asyncHandler(async (req, res) => {
  res.json({ followups: await service.listFollowups(req.params.id) });
}));
admissionsRouter.post('/:id/followups', EDIT, asyncHandler(async (req, res) => {
  res.status(201).json({ followup: await service.addFollowup(req.params.id, req.body || {}, req.user) });
}));

admissionsRouter.post('/:id/to-application', EDIT, asyncHandler(async (req, res) => {
  res.json({ admission: await service.moveToApplication(req.params.id, req.user) });
}));
admissionsRouter.post('/:id/approve', APPROVE, asyncHandler(async (req, res) => {
  res.json({ admission: await service.approveAdmission(req.params.id, req.body || {}, req.user) });
}));
admissionsRouter.post('/:id/reject', APPROVE, asyncHandler(async (req, res) => {
  res.json({ admission: await service.rejectAdmission(req.params.id, req.body || {}, req.user) });
}));
admissionsRouter.post('/:id/convert', CONVERT, asyncHandler(async (req, res) => {
  res.status(201).json(await service.convertToStudent(req.params.id, req.body || {}, req.user));
}));

admissionsRouter.post('/:id/archive', EDIT, asyncHandler(async (req, res) => {
  res.json({ admission: await service.archiveAdmission(req.params.id, req.user) });
}));
admissionsRouter.post('/:id/restore', EDIT, asyncHandler(async (req, res) => {
  res.json({ admission: await service.restoreAdmission(req.params.id, req.user) });
}));
