import { Router } from 'express';
import * as service from './communication.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const communicationRouter = Router();
communicationRouter.use(requireAuth);

const VIEW = requirePermission('communication.view');
const CREATE = requirePermission('communication.create');
const SEND = requirePermission('communication.send', 'communication.create');

// Notices
communicationRouter.get('/notices', VIEW, asyncHandler(async (req, res) => res.json({ notices: await service.listNotices(req.query) })));
communicationRouter.post('/notices', CREATE, asyncHandler(async (req, res) => res.status(201).json({ notice: await service.createNotice(req.body || {}, req.user) })));
communicationRouter.get('/notices/:id', VIEW, asyncHandler(async (req, res) => res.json({ notice: await service.getNotice(req.params.id) })));
communicationRouter.patch('/notices/:id', CREATE, asyncHandler(async (req, res) => res.json({ notice: await service.updateNotice(req.params.id, req.body || {}, req.user) })));
communicationRouter.post('/notices/:id/send', SEND, asyncHandler(async (req, res) => res.json(await service.sendNotice(req.params.id, req.user))));
communicationRouter.post('/notices/:id/archive', CREATE, asyncHandler(async (req, res) => res.json({ notice: await service.archiveNotice(req.params.id, req.user) })));

// Templates
communicationRouter.get('/templates', VIEW, asyncHandler(async (req, res) => res.json({ templates: await service.listTemplates(req.query) })));
communicationRouter.post('/templates', CREATE, asyncHandler(async (req, res) => res.status(201).json({ template: await service.createTemplate(req.body || {}, req.user) })));
communicationRouter.patch('/templates/:id', CREATE, asyncHandler(async (req, res) => res.json({ template: await service.updateTemplate(req.params.id, req.body || {}, req.user) })));
communicationRouter.post('/templates/:id/archive', CREATE, asyncHandler(async (req, res) => res.json({ template: await service.archiveTemplate(req.params.id, req.user) })));
