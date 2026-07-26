// Any authenticated user can request upload/download URLs; the storage service
// enforces per-folder type/size policy. (Ownership scoping for parent/student
// downloads is enforced at the module level when those endpoints are added.)

import { Router } from 'express';
import * as ctrl from './files.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.post('/presign-upload', ctrl.presignUpload);
filesRouter.get('/presign-download', ctrl.presignDownload);
filesRouter.get('/resolve', ctrl.resolveUrl);
filesRouter.delete('/', ctrl.remove);
