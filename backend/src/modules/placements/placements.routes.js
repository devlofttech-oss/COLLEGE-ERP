// Placements — a REFERENCE CUSTOM MODULE. It ships in the shared codebase but is
// off by default; it only works for institutions whose `enabledModules` include
// "placements" (enabled by the Devloft super-admin per client). It reuses the
// standard repo()/crudController, so it is automatically tenant-scoped and
// isolated like every other module — the pattern for all bespoke client features.

import { Router } from 'express';
import { repo } from '../../utils/firestore.js';
import { crudController } from '../../utils/crudController.js';
import { pick, requireFields, oneOf } from '../../utils/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/requireModule.js';
import { requirePermission } from '../../middleware/requirePermission.js';

export const placementsRouter = Router();
placementsRouter.use(requireAuth, requireModule('placements'));

const VIEW = requirePermission('placements.view');
const MANAGE = requirePermission('placements.manage');

const STATUSES = ['open', 'in-progress', 'placed', 'closed'];

const controller = crudController(repo('placements'), {
  entity: 'placement',
  orderBy: { field: 'createdAt', direction: 'desc' },
  buildWhere: (req) =>
    ['studentId', 'company', 'status'].filter((f) => req.query[f] !== undefined).map((f) => [f, '==', req.query[f]]),
  validate: async (data) => {
    requireFields(data, ['company', 'role']);
    const out = pick(data, ['studentId', 'studentName', 'company', 'role', 'package', 'driveDate', 'status', 'remarks']);
    oneOf(out.status, STATUSES, 'status');
    out.status = out.status || 'open';
    if (out.package !== undefined) out.package = Number(out.package) || null;
    return out;
  },
});

placementsRouter.get('/', VIEW, controller.list);
placementsRouter.get('/:id', VIEW, controller.get);
placementsRouter.post('/', MANAGE, controller.create);
placementsRouter.patch('/:id', MANAGE, controller.update);
placementsRouter.post('/:id/archive', MANAGE, controller.archive);
placementsRouter.post('/:id/restore', MANAGE, controller.restore);
