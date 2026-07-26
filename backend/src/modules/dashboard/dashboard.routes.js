import { Router } from 'express';
import * as service from './dashboard.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const VIEW = requirePermission('dashboard.view');

dashboardRouter.get('/overview', VIEW, asyncHandler(async (req, res) => {
  res.json(await service.overview());
}));

dashboardRouter.get('/recent-activities', VIEW, asyncHandler(async (req, res) => {
  res.json({ activities: await service.recentActivities(req.query.limit) });
}));
