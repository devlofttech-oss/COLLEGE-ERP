import { Router } from 'express';
import * as service from './dashboard.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission, requireRole } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ROLES } from '../../config/permissions.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const VIEW = requirePermission('dashboard.view');

// Devloft cross-tenant view (declared before the tenant routes).
dashboardRouter.get('/platform', requireRole(ROLES.SUPER_ADMIN), asyncHandler(async (req, res) => {
  res.json(await service.platformOverview());
}));

dashboardRouter.get('/overview', VIEW, asyncHandler(async (req, res) => {
  res.json(await service.overview());
}));

dashboardRouter.get('/recent-activities', VIEW, asyncHandler(async (req, res) => {
  res.json({ activities: await service.recentActivities(req.query.limit) });
}));
