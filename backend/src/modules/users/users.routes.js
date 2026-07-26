import { Router } from 'express';
import * as ctrl from './users.controller.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/', requirePermission('users.view'), ctrl.list);
usersRouter.get('/:uid', requirePermission('users.view'), ctrl.get);
usersRouter.post('/', requirePermission('users.manage'), ctrl.create);
usersRouter.patch('/:uid', requirePermission('users.manage'), ctrl.update);
usersRouter.patch('/:uid/role', requirePermission('users.manage'), ctrl.changeRole);
usersRouter.patch('/:uid/linked-students', requirePermission('users.manage'), ctrl.setLinkedStudents);
usersRouter.post('/:uid/archive', requirePermission('users.manage'), ctrl.archive);
usersRouter.post('/:uid/restore', requirePermission('users.manage'), ctrl.restore);
