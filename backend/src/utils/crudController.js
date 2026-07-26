// Factory that turns a Firestore repo into a standard set of REST handlers:
// list / get / create / update / archive / restore. Modules pass optional hooks
// for validation and referential checks. This keeps each module's boilerplate to
// a minimum while still allowing per-entity rules.

import { asyncHandler } from './asyncHandler.js';
import { recordAudit } from '../services/audit.service.js';

export function crudController(repository, options = {}) {
  const {
    entity = 'record', // used in audit logs
    // async (data, { mode, req }) => cleanedData ; throw ApiError on invalid
    validate = async (data) => data,
    // optional filter builder from query params: (req) => where[]
    buildWhere = () => [],
    orderBy,
    audit = true,
  } = options;

  const log = (action, req, entityId, meta) => {
    if (audit) recordAudit({ action: `${entity}.${action}`, entity, entityId, actor: req.user, meta });
  };

  return {
    list: asyncHandler(async (req, res) => {
      const includeArchived = req.query.includeArchived === 'true';
      const items = await repository.list({
        where: buildWhere(req),
        orderBy,
        includeArchived,
      });
      res.json({ [`${entity}s`]: items, count: items.length });
    }),

    get: asyncHandler(async (req, res) => {
      const item = await repository.getByIdOrFail(req.params.id);
      res.json({ [entity]: item });
    }),

    create: asyncHandler(async (req, res) => {
      const data = await validate(req.body || {}, { mode: 'create', req });
      const item = await repository.create(data, { actor: req.user });
      log('create', req, item.id);
      res.status(201).json({ [entity]: item });
    }),

    update: asyncHandler(async (req, res) => {
      const data = await validate(req.body || {}, { mode: 'update', req, id: req.params.id });
      const item = await repository.update(req.params.id, data, { actor: req.user });
      log('update', req, req.params.id);
      res.json({ [entity]: item });
    }),

    archive: asyncHandler(async (req, res) => {
      const item = await repository.archive(req.params.id, { actor: req.user });
      log('archive', req, req.params.id);
      res.json({ [entity]: item });
    }),

    restore: asyncHandler(async (req, res) => {
      const item = await repository.restore(req.params.id, { actor: req.user });
      log('restore', req, req.params.id);
      res.json({ [entity]: item });
    }),
  };
}

// Mount a standard CRUD resource on a router with view/manage permission gates.
export function mountCrud(router, path, controller, { view, manage }, extra) {
  const { requirePermission } = extra.perm;
  router.get(path, requirePermission(view), controller.list);
  router.get(`${path}/:id`, requirePermission(view), controller.get);
  router.post(path, requirePermission(manage), controller.create);
  router.patch(`${path}/:id`, requirePermission(manage), controller.update);
  router.post(`${path}/:id/archive`, requirePermission(manage), controller.archive);
  router.post(`${path}/:id/restore`, requirePermission(manage), controller.restore);
}
