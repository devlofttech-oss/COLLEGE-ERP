// 404 + central error handling. Every thrown ApiError (or unexpected error)
// becomes a consistent JSON envelope: { error: { message, ...details } }.

import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const body = {
    error: {
      message: err.message || 'Internal server error',
    },
  };
  if (err.details !== undefined) body.error.details = err.details;
  if (!env.isProd && statusCode >= 500) body.error.stack = err.stack;

  if (statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(statusCode).json(body);
}
