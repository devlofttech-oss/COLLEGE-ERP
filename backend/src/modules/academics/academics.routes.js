import { Router } from 'express';
import { repos, validators, setCurrentAcademicYear, getCurrentAcademicYear } from './academics.service.js';
import { crudController } from '../../utils/crudController.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const academicsRouter = Router();
academicsRouter.use(requireAuth);

const VIEW = requirePermission('academics.view');
const MANAGE = requirePermission('academics.manage');

// Helper to pull equality filters from query params.
const whereFrom = (fields) => (req) =>
  fields
    .filter((f) => req.query[f] !== undefined)
    .map((f) => [f, '==', req.query[f]]);

// ── Controllers ──
const academicYears = crudController(repos.academicYears, {
  entity: 'academicYear',
  validate: validators.academicYear,
  orderBy: { field: 'name', direction: 'desc' },
});
const courses = crudController(repos.courses, {
  entity: 'course',
  validate: validators.course,
  buildWhere: whereFrom(['academicYear', 'status']),
  orderBy: { field: 'name' },
});
const classes = crudController(repos.classes, {
  entity: 'class',
  validate: validators.klass,
  buildWhere: whereFrom(['academicYear', 'courseId', 'status']),
  orderBy: { field: 'name' },
});
const sections = crudController(repos.sections, {
  entity: 'section',
  validate: validators.section,
  buildWhere: whereFrom(['classId', 'academicYear', 'status']),
  orderBy: { field: 'name' },
});
const subjects = crudController(repos.subjects, {
  entity: 'subject',
  validate: validators.subject,
  buildWhere: whereFrom(['classId', 'courseId', 'academicYear', 'assignedTeacherId', 'status']),
  orderBy: { field: 'name' },
});
const teacherAllocations = crudController(repos.teacherAllocations, {
  entity: 'teacherAllocation',
  validate: validators.teacherAllocation,
  buildWhere: whereFrom(['teacherId', 'classId', 'sectionId', 'academicYear', 'status']),
});

// Wire a standard CRUD resource.
function resource(path, ctrl) {
  academicsRouter.get(path, VIEW, ctrl.list);
  academicsRouter.get(`${path}/:id`, VIEW, ctrl.get);
  academicsRouter.post(path, MANAGE, ctrl.create);
  academicsRouter.patch(`${path}/:id`, MANAGE, ctrl.update);
  academicsRouter.post(`${path}/:id/archive`, MANAGE, ctrl.archive);
  academicsRouter.post(`${path}/:id/restore`, MANAGE, ctrl.restore);
}

// ── Special academic-year actions (declare before the generic resource) ──
academicsRouter.get('/academic-years/current', VIEW, asyncHandler(async (req, res) => {
  res.json({ academicYear: await getCurrentAcademicYear() });
}));
academicsRouter.post('/academic-years/:id/set-current', MANAGE, asyncHandler(async (req, res) => {
  res.json({ academicYear: await setCurrentAcademicYear(req.params.id, req.user) });
}));

resource('/academic-years', academicYears);
resource('/courses', courses);
resource('/classes', classes);
resource('/sections', sections);
resource('/subjects', subjects);
resource('/teacher-allocations', teacherAllocations);
