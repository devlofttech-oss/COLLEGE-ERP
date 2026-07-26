// Tiny validation helpers. Deliberately lightweight — enough to enforce required
// fields and whitelist inputs without pulling in a schema library.

import { ApiError } from './ApiError.js';

export function requireFields(data, fields) {
  const missing = fields.filter((f) => {
    const v = data?.[f];
    return v === undefined || v === null || v === '';
  });
  if (missing.length) {
    throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`, { missing });
  }
}

// Keep only the listed keys (whitelist). Undefined values are dropped.
export function pick(data, fields) {
  const out = {};
  for (const f of fields) {
    if (data?.[f] !== undefined) out[f] = data[f];
  }
  return out;
}

export function oneOf(value, allowed, field = 'value') {
  if (value !== undefined && !allowed.includes(value)) {
    throw ApiError.badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  }
}

export function toBool(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}
