import * as storage from '../../services/storage.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';

// Client asks for permission to upload; gets back a presigned PUT URL + the key
// to store on the related record after the upload completes.
export const presignUpload = asyncHandler(async (req, res) => {
  const { folder, ownerId, filename, contentType, sizeBytes } = req.body || {};
  if (!folder || !filename) throw ApiError.badRequest('folder and filename are required.');
  const result = await storage.presignUpload({ folder, ownerId, filename, contentType, sizeBytes });
  res.json(result);
});

// Get a short-lived URL to view/download a private object.
export const presignDownload = asyncHandler(async (req, res) => {
  const key = req.query.key;
  const downloadName = req.query.name;
  if (!key) throw ApiError.badRequest('key is required.');
  const result = await storage.presignDownload(key, { downloadName });
  res.json(result);
});

// Resolve a readable URL for any stored key (public URL or presigned GET).
export const resolveUrl = asyncHandler(async (req, res) => {
  const key = req.query.key;
  if (!key) throw ApiError.badRequest('key is required.');
  res.json({ key, url: await storage.resolveFileUrl(key) });
});

export const remove = asyncHandler(async (req, res) => {
  const key = req.body?.key || req.query.key;
  if (!key) throw ApiError.badRequest('key is required.');
  res.json(await storage.deleteObject(key));
});
