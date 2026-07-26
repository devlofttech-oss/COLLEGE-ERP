import * as service from './users.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  res.json({ users: await service.listUsers({ includeArchived }) });
});

export const get = asyncHandler(async (req, res) => {
  res.json({ user: await service.getUser(req.params.uid) });
});

export const create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body || {}, req.user);
  recordAudit({ action: 'users.create', entity: 'user', entityId: user.id, actor: req.user, meta: { role: user.role } });
  res.status(201).json({ user });
});

export const update = asyncHandler(async (req, res) => {
  const user = await service.updateUser(req.params.uid, req.body || {}, req.user);
  recordAudit({ action: 'users.update', entity: 'user', entityId: req.params.uid, actor: req.user });
  res.json({ user });
});

export const changeRole = asyncHandler(async (req, res) => {
  const user = await service.changeUserRole(req.params.uid, req.body?.role, req.user);
  recordAudit({ action: 'users.changeRole', entity: 'user', entityId: req.params.uid, actor: req.user, meta: { role: req.body?.role } });
  res.json({ user });
});

export const setLinkedStudents = asyncHandler(async (req, res) => {
  const user = await service.setLinkedStudents(req.params.uid, req.body?.studentIds, req.user);
  recordAudit({ action: 'users.linkStudents', entity: 'user', entityId: req.params.uid, actor: req.user });
  res.json({ user });
});

export const archive = asyncHandler(async (req, res) => {
  const user = await service.archiveUser(req.params.uid, req.user);
  recordAudit({ action: 'users.archive', entity: 'user', entityId: req.params.uid, actor: req.user });
  res.json({ user });
});

export const restore = asyncHandler(async (req, res) => {
  const user = await service.restoreUser(req.params.uid, req.user);
  recordAudit({ action: 'users.restore', entity: 'user', entityId: req.params.uid, actor: req.user });
  res.json({ user });
});
