// Gate a whole module by the current institution's enabled-modules list. Runs
// AFTER requireAuth (which loads req.institution). Devloft super-admin bypasses so
// they can support any tenant.

import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/permissions.js';

export function requireModule(moduleId) {
  return (req, res, next) => {
    if (req.user?.role === ROLES.SUPER_ADMIN) return next();
    const enabled = req.institution?.enabledModules || [];
    if (!enabled.includes(moduleId)) {
      return next(new ApiError(403, `The "${moduleId}" module is not enabled for your institution.`, { code: 'module-disabled', module: moduleId }));
    }
    next();
  };
}
