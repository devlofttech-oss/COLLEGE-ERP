import { Router } from 'express';
import * as service from './results.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { generateReportCard } from '../../services/pdf.service.js';
import { getInstitution } from '../settings/settings.service.js';

export const resultsRouter = Router();
resultsRouter.use(requireAuth);

const VIEW = requirePermission('results.view', 'results.viewOwn');
const PROCESS = requirePermission('results.process');
const PUBLISH = requirePermission('results.publish');

// Grade settings
resultsRouter.get('/grade-settings', VIEW, asyncHandler(async (req, res) => res.json({ gradeSettings: await service.listGradeSettings(req.query) })));
resultsRouter.put('/grade-settings', PROCESS, asyncHandler(async (req, res) => res.json({ gradeSettings: await service.saveGradeSettings(req.body || {}, req.user) })));

// Processing + listing
resultsRouter.post('/process', PROCESS, asyncHandler(async (req, res) => res.json(await service.processResults(req.body || {}, req.user))));
resultsRouter.get('/', VIEW, asyncHandler(async (req, res) => res.json({ results: await service.listResults(req.query) })));

// Publish + lock
resultsRouter.post('/publish', PUBLISH, asyncHandler(async (req, res) => res.json(await service.publishResults(req.body || {}, req.user))));
resultsRouter.post('/lock', PUBLISH, asyncHandler(async (req, res) => res.json(await service.setLock(req.body || {}, true, req.user))));
resultsRouter.post('/unlock', PUBLISH, asyncHandler(async (req, res) => res.json(await service.setLock(req.body || {}, false, req.user))));

// Report card + history
resultsRouter.get('/report-card', VIEW, asyncHandler(async (req, res) => res.json({ reportCard: await service.reportCard(req.query.examId, req.query.studentId) })));
resultsRouter.get('/report-card/pdf', VIEW, asyncHandler(async (req, res) => {
  const [reportCard, institution] = await Promise.all([
    service.reportCard(req.query.examId, req.query.studentId),
    getInstitution().catch(() => ({})),
  ]);
  const pdf = await generateReportCard(reportCard, institution);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="report-card-${req.query.studentId}.pdf"`);
  res.send(pdf);
}));
resultsRouter.get('/history/:studentId', VIEW, asyncHandler(async (req, res) => res.json({ history: await service.resultHistory(req.params.studentId) })));
