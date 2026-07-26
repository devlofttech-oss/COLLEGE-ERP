import * as service from './roles.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listRoles = asyncHandler(async (req, res) => {
  res.json({ roles: await service.listRolesWithPermissions() });
});

export const permissionCatalog = asyncHandler(async (req, res) => {
  res.json(service.getPermissionCatalog());
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const { permissions } = req.body || {};
  const updated = await service.setRolePermissions(role, permissions, req.user);
  recordAudit({ action: 'roles.updatePermissions', entity: 'role', entityId: role, actor: req.user, meta: { count: updated.length } });
  res.json({ role, permissions: updated });
});

export const resetRolePermissions = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const permissions = await service.resetRolePermissions(role);
  recordAudit({ action: 'roles.resetPermissions', entity: 'role', entityId: role, actor: req.user });
  res.json({ role, permissions });
});
