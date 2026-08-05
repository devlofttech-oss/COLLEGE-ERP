// Devloft super-admin only. Cross-tenant: operates on the global `institutions`
// registry using explicit ids (no ambient tenant context needed).

import { Router } from 'express';
import * as service from './institutions.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../config/permissions.js';

export const institutionsRouter = Router();

institutionsRouter.use(requireAuth, requireRole(ROLES.SUPER_ADMIN));

institutionsRouter.get('/', asyncHandler(async (req, res) => {
  res.json({ institutions: await service.listInstitutions() });
}));
institutionsRouter.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createInstitution(req.body || {}, req.user));
}));
institutionsRouter.get('/:id', asyncHandler(async (req, res) => {
  res.json({ institution: await service.getInstitution(req.params.id) });
}));
institutionsRouter.patch('/:id', asyncHandler(async (req, res) => {
  res.json({ institution: await service.updateInstitution(req.params.id, req.body || {}, req.user) });
}));
institutionsRouter.patch('/:id/modules', asyncHandler(async (req, res) => {
  res.json({ institution: await service.setModules(req.params.id, req.body?.enabledModules, req.user) });
}));
institutionsRouter.patch('/:id/features', asyncHandler(async (req, res) => {
  res.json({ institution: await service.setFeatures(req.params.id, req.body?.featureFlags, req.user) });
}));
