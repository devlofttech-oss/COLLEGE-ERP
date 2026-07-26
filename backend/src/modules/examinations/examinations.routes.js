import { Router } from 'express';
import * as service from './examinations.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const examinationsRouter = Router();
examinationsRouter.use(requireAuth);

const VIEW = requirePermission('examinations.view', 'examinations.viewOwn');
const CREATE = requirePermission('examinations.create');
const MARKS = requirePermission('examinations.marks');
const VERIFY = requirePermission('examinations.verify');

// Exams
examinationsRouter.get('/exams', VIEW, asyncHandler(async (req, res) => res.json({ exams: await service.listExams(req.query) })));
examinationsRouter.post('/exams', CREATE, asyncHandler(async (req, res) => res.status(201).json({ exam: await service.createExam(req.body || {}, req.user) })));
examinationsRouter.patch('/exams/:id', CREATE, asyncHandler(async (req, res) => res.json({ exam: await service.updateExam(req.params.id, req.body || {}, req.user) })));
examinationsRouter.post('/exams/:id/archive', CREATE, asyncHandler(async (req, res) => res.json({ exam: await service.archiveExam(req.params.id, req.user) })));

// Schedules
examinationsRouter.get('/schedules', VIEW, asyncHandler(async (req, res) => res.json({ schedules: await service.listSchedules(req.query) })));
examinationsRouter.post('/schedules', CREATE, asyncHandler(async (req, res) => res.status(201).json({ schedule: await service.createSchedule(req.body || {}, req.user) })));
examinationsRouter.patch('/schedules/:id', CREATE, asyncHandler(async (req, res) => res.json({ schedule: await service.updateSchedule(req.params.id, req.body || {}, req.user) })));
examinationsRouter.post('/schedules/:id/archive', CREATE, asyncHandler(async (req, res) => res.json({ schedule: await service.archiveSchedule(req.params.id, req.user) })));

// Marks
examinationsRouter.get('/marks', VIEW, asyncHandler(async (req, res) => res.json({ marks: await service.listMarks(req.query) })));
examinationsRouter.post('/marks', MARKS, asyncHandler(async (req, res) => res.json(await service.enterMarks(req.body || {}, req.user))));
examinationsRouter.post('/marks/verify', VERIFY, asyncHandler(async (req, res) => res.json(await service.verifyMarks(req.body || {}, req.user))));
examinationsRouter.post('/marks/unlock', VERIFY, asyncHandler(async (req, res) => res.json(await service.unlockMarks(req.body || {}, req.user))));
