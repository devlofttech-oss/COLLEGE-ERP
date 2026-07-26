// R2 object storage service. Files (documents, photos, generated PDFs) are stored
// in Cloudflare R2. Because the backend runs on Vercel serverless (small request
// body limit), the browser uploads DIRECTLY to R2 using a presigned URL the
// backend hands out — file bytes never pass through the server.

import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Ready, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2.js';
import { ApiError } from '../utils/ApiError.js';

const MB = 1024 * 1024;

// Per-folder upload policy: allowed mime types + max size + public/private.
// `public: true` folders are served from R2_PUBLIC_URL; private folders require a
// short-lived presigned GET to read.
export const FOLDERS = {
  'profile-photos': { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 5 * MB, public: true },
  'institution': { types: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'], maxBytes: 5 * MB, public: true },
  'student-documents': { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB, public: false },
  'staff-documents': { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB, public: false },
  'managed-documents': { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB, public: false },
  'subject-notes': { types: ['application/pdf'], maxBytes: 25 * MB, public: false },
  'communication-attachments': { types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * MB, public: false },
  'receipts': { types: ['application/pdf'], maxBytes: 5 * MB, public: false },
  'report-cards': { types: ['application/pdf'], maxBytes: 5 * MB, public: false },
  'id-cards': { types: ['application/pdf', 'image/png'], maxBytes: 5 * MB, public: false },
};

function assertReady() {
  if (!r2Ready || !r2Client) {
    throw new ApiError(503, 'File storage (R2) is not configured on the server.');
  }
}

function sanitizeSegment(value, fallback = 'unknown') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || fallback;
}

// Build a stable, collision-resistant object key.
export function buildKey({ folder, ownerId, filename, stamp }) {
  const owner = sanitizeSegment(ownerId, 'general');
  const name = sanitizeSegment(filename, 'file');
  const ts = stamp || Date.now();
  return `${folder}/${owner}/${ts}-${name}`;
}

export function publicUrlFor(key) {
  return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : null;
}

function validate(folder, contentType, sizeBytes) {
  const policy = FOLDERS[folder];
  if (!policy) throw ApiError.badRequest(`Unknown upload folder: ${folder}`);
  if (contentType && policy.types.length && !policy.types.includes(contentType)) {
    throw ApiError.badRequest(`File type ${contentType} not allowed for ${folder}. Allowed: ${policy.types.join(', ')}`);
  }
  if (sizeBytes && sizeBytes > policy.maxBytes) {
    throw ApiError.badRequest(`File too large. Max for ${folder} is ${Math.round(policy.maxBytes / MB)} MB.`);
  }
  return policy;
}

// Generate a presigned PUT URL for a direct browser→R2 upload.
export async function presignUpload({ folder, ownerId, filename, contentType, sizeBytes }) {
  assertReady();
  const policy = validate(folder, contentType, sizeBytes);
  const key = buildKey({ folder, ownerId, filename });

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 min

  return {
    key,
    uploadUrl,
    method: 'PUT',
    headers: { 'Content-Type': contentType || 'application/octet-stream' },
    public: policy.public,
    publicUrl: policy.public ? publicUrlFor(key) : null,
    expiresIn: 300,
  };
}

// Generate a short-lived presigned GET URL for a private object.
export async function presignDownload(key, { expiresIn = 300, downloadName } = {}) {
  assertReady();
  if (!key) throw ApiError.badRequest('An object key is required.');
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ...(downloadName
      ? { ResponseContentDisposition: `attachment; filename="${sanitizeSegment(downloadName)}"` }
      : {}),
  });
  const url = await getSignedUrl(r2Client, command, { expiresIn });
  return { url, expiresIn };
}

// Resolve a readable URL for a stored object: public URL if the folder is public,
// otherwise a presigned GET.
export async function resolveFileUrl(key) {
  const folder = String(key || '').split('/')[0];
  const policy = FOLDERS[folder];
  if (policy?.public) return publicUrlFor(key);
  const { url } = await presignDownload(key);
  return url;
}

// Store a server-generated buffer (receipts, report cards, ID cards) directly.
export async function putObject({ key, body, contentType }) {
  assertReady();
  await r2Client.send(
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return { key, publicUrl: publicUrlFor(key) };
}

export async function deleteObject(key) {
  assertReady();
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  return { key, deleted: true };
}
