import { Router } from 'express';
import * as service from './timetable.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/requireModule.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const timetableRouter = Router();
timetableRouter.use(requireAuth, requireModule('timetable'));

const VIEW = requirePermission('timetable.view', 'timetable.viewOwn');
const MANAGE = requirePermission('timetable.manage');

// Periods
timetableRouter.get('/periods', VIEW, asyncHandler(async (req, res) => res.json({ periods: await service.listPeriods() })));
timetableRouter.post('/periods', MANAGE, asyncHandler(async (req, res) => res.status(201).json({ period: await service.createPeriod(req.body || {}, req.user) })));
timetableRouter.patch('/periods/:id', MANAGE, asyncHandler(async (req, res) => res.json({ period: await service.updatePeriod(req.params.id, req.body || {}, req.user) })));
timetableRouter.post('/periods/:id/archive', MANAGE, asyncHandler(async (req, res) => res.json({ period: await service.archivePeriod(req.params.id, req.user) })));

// Views
timetableRouter.get('/class', VIEW, asyncHandler(async (req, res) => res.json({ timetable: await service.classTimetable(req.query) })));
timetableRouter.get('/teacher', VIEW, asyncHandler(async (req, res) => res.json({ timetable: await service.teacherTimetable(req.query) })));

// Entries
timetableRouter.get('/entries', VIEW, asyncHandler(async (req, res) => res.json({ entries: await service.listEntries(req.query) })));
timetableRouter.post('/entries', MANAGE, asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  res.status(201).json(await service.createEntry(req.body || {}, req.user, { force }));
}));
timetableRouter.patch('/entries/:id', MANAGE, asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  res.json(await service.updateEntry(req.params.id, req.body || {}, req.user, { force }));
}));
timetableRouter.post('/entries/:id/archive', MANAGE, asyncHandler(async (req, res) => res.json({ entry: await service.archiveEntry(req.params.id, req.user) })));
