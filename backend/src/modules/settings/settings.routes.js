import { Router } from 'express';
import * as service from './settings.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

const VIEW = requirePermission('settings.view');
const MANAGE = requirePermission('settings.manage');

settingsRouter.get('/institution', VIEW, asyncHandler(async (req, res) => res.json({ institution: await service.getInstitution() })));
settingsRouter.put('/institution', MANAGE, asyncHandler(async (req, res) => res.json({ institution: await service.updateInstitution(req.body || {}, req.user) })));

settingsRouter.get('/branding', VIEW, asyncHandler(async (req, res) => res.json({ branding: await service.getBranding() })));
settingsRouter.put('/branding', MANAGE, asyncHandler(async (req, res) => res.json({ branding: await service.updateBranding(req.body || {}, req.user) })));

settingsRouter.get('/integrations', MANAGE, asyncHandler(async (req, res) => res.json({ integrations: await service.getIntegrations() })));
settingsRouter.put('/integrations', MANAGE, asyncHandler(async (req, res) => res.json({ integrations: await service.updateIntegrations(req.body || {}, req.user) })));

settingsRouter.get('/backup', MANAGE, asyncHandler(async (req, res) => res.json({ backup: await service.getBackupSettings() })));
settingsRouter.put('/backup', MANAGE, asyncHandler(async (req, res) => res.json({ backup: await service.updateBackupSettings(req.body || {}, req.user) })));
