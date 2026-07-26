import { Router } from 'express';
import * as service from './reports.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const VIEW = requirePermission('reports.view');
const EXPORT = requirePermission('reports.export', 'reports.view');

// List available reports.
reportsRouter.get('/', VIEW, asyncHandler(async (req, res) => {
  res.json({ reports: service.listReportNames() });
}));

// Run a report as JSON.
reportsRouter.get('/:name', VIEW, asyncHandler(async (req, res) => {
  res.json({ name: req.params.name, ...(await service.runReport(req.params.name, req.query)) });
}));

// Export a report as CSV.
reportsRouter.get('/:name/export', EXPORT, asyncHandler(async (req, res) => {
  const result = await service.runReport(req.params.name, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}.csv"`);
  res.send(service.toCsv(result));
}));
