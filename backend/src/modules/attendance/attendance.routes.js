import { Router } from 'express';
import * as service from './attendance.service.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/requireModule.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth, requireModule('attendance'));

const VIEW = requirePermission('attendance.view');
const MARK = requirePermission('attendance.mark');
const REPORT = requirePermission('attendance.report', 'attendance.view');

// Student attendance
attendanceRouter.get('/', VIEW, asyncHandler(async (req, res) => {
  res.json({ records: await service.listStudentAttendance(req.query) });
}));
attendanceRouter.post('/mark', MARK, asyncHandler(async (req, res) => {
  res.json(await service.markStudentAttendance(req.body || {}, req.user));
}));

// Staff attendance
attendanceRouter.get('/staff', VIEW, asyncHandler(async (req, res) => {
  res.json({ records: await service.listStaffAttendance(req.query) });
}));
attendanceRouter.post('/staff/mark', MARK, asyncHandler(async (req, res) => {
  res.json(await service.markStaffAttendance(req.body || {}, req.user));
}));

// Reports
attendanceRouter.get('/reports/daily', REPORT, asyncHandler(async (req, res) => {
  res.json(await service.dailyReport(req.query));
}));
attendanceRouter.get('/reports/monthly', REPORT, asyncHandler(async (req, res) => {
  res.json(await service.monthlyReport(req.query));
}));
attendanceRouter.get('/reports/student-percentage', REPORT, asyncHandler(async (req, res) => {
  res.json(await service.studentPercentage(req.query));
}));
