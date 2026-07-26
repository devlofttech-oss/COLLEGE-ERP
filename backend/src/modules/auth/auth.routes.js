import { Router } from 'express';
import * as ctrl from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/login', ctrl.login);
authRouter.post('/logout', ctrl.logout);
authRouter.post('/password-reset', ctrl.requestPasswordReset);

authRouter.get('/me', requireAuth, ctrl.me);
authRouter.post('/logout-everywhere', requireAuth, ctrl.logoutEverywhere);
