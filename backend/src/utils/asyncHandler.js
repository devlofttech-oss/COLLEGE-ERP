// Wraps an async route handler so thrown/rejected errors flow to the central
// error middleware instead of crashing the request.

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
