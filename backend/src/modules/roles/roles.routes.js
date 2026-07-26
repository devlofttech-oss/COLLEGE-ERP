import { Router } from 'express';
import * as ctrl from './roles.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get('/', requirePermission('roles.view'), ctrl.listRoles);
rolesRouter.get('/permissions/catalog', requirePermission('roles.view'), ctrl.permissionCatalog);
rolesRouter.put('/:role/permissions', requirePermission('roles.manage'), ctrl.updateRolePermissions);
rolesRouter.delete('/:role/permissions', requirePermission('roles.manage'), ctrl.resetRolePermissions);
