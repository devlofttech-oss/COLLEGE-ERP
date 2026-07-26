// Mobile self-service routes. Mounted at /api/my. Every route requires auth; the
// service enforces per-user ownership. Data routes are gated on the matching
// *.viewOwn permission (held by parent/student); teacher routes on view perms.

import { Router } from 'express';
import * as service from './portal.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const portalRouter = Router();
portalRouter.use(requireAuth);

// ── Parent / Student self-view ──
portalRouter.get('/students', requirePermission('students.viewOwn'), asyncHandler(async (req, res) => {
  res.json({ students: await service.myStudents(req.user) });
}));
portalRouter.get('/profile', requirePermission('students.viewOwn'), asyncHandler(async (req, res) => {
  res.json({ student: await service.myProfile(req.user, req.query) });
}));
portalRouter.get('/attendance', requirePermission('attendance.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myAttendance(req.user, req.query));
}));
portalRouter.get('/fees', requirePermission('fees.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myFees(req.user, req.query));
}));
portalRouter.get('/timetable', requirePermission('timetable.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myTimetable(req.user, req.query));
}));
portalRouter.get('/exams', requirePermission('examinations.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myExams(req.user, req.query));
}));
portalRouter.get('/results', requirePermission('results.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myResults(req.user, req.query));
}));
portalRouter.get('/notices', requirePermission('communication.view'), asyncHandler(async (req, res) => {
  res.json(await service.myNotices(req.user, req.query));
}));
portalRouter.get('/downloads', requirePermission('students.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myDownloads(req.user, req.query));
}));

// ── Teacher self-view ──
portalRouter.get('/classes', requirePermission('attendance.mark', 'timetable.view', 'examinations.marks'), asyncHandler(async (req, res) => {
  res.json(await service.myClasses(req.user));
}));
portalRouter.get('/teaching-timetable', requirePermission('timetable.view', 'timetable.viewOwn'), asyncHandler(async (req, res) => {
  res.json(await service.myTeachingTimetable(req.user, req.query));
}));
