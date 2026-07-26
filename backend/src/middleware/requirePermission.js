// RBAC gate. Use after requireAuth. Accepts one or more permission strings;
// the caller must hold at least one of them.
//
//   router.get('/', requireAuth, requirePermission('students.view'), handler)

import { ApiError } from '../utils/ApiError.js';

export function requirePermission(...needed) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const held = req.user.permissions || [];
    const ok = needed.some((p) => held.includes(p));
    if (!ok) {
      return next(ApiError.forbidden(`Missing required permission: ${needed.join(' or ')}`));
    }
    next();
  };
}

// Convenience: require a specific role (rarely needed; prefer permissions).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your role cannot perform this action.'));
    }
    next();
  };
}
