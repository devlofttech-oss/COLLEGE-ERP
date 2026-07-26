// Root API router. Each module registers its sub-router here.

import { Router } from 'express';
import { firebaseReady } from './config/firebase.js';
import { r2Ready } from './config/r2.js';

export const apiRouter = Router();

// ── Health / readiness ──
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'college-erp-backend',
    firebase: firebaseReady,
    r2: r2Ready,
    time: new Date().toISOString(),
  });
});

// ── Module routers ──
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { academicsRouter } from './modules/academics/academics.routes.js';
import { studentsRouter } from './modules/students/students.routes.js';
import { admissionsRouter } from './modules/admissions/admissions.routes.js';
import { staffRouter } from './modules/staff/staff.routes.js';
import { attendanceRouter } from './modules/attendance/attendance.routes.js';
import { feesRouter } from './modules/fees/fees.routes.js';
import { timetableRouter } from './modules/timetable/timetable.routes.js';
import { examinationsRouter } from './modules/examinations/examinations.routes.js';
import { resultsRouter } from './modules/results/results.routes.js';
import { communicationRouter } from './modules/communication/communication.routes.js';
import { settingsRouter } from './modules/settings/settings.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { portalRouter } from './modules/portal/portal.routes.js';

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/roles', rolesRouter);
apiRouter.use('/files', filesRouter);
apiRouter.use('/academics', academicsRouter);
apiRouter.use('/students', studentsRouter);
apiRouter.use('/admissions', admissionsRouter);
apiRouter.use('/staff', staffRouter);
apiRouter.use('/attendance', attendanceRouter);
apiRouter.use('/fees', feesRouter);
apiRouter.use('/timetable', timetableRouter);
apiRouter.use('/examinations', examinationsRouter);
apiRouter.use('/results', resultsRouter);
apiRouter.use('/communication', communicationRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/my', portalRouter);
