// Cloudflare R2 client (S3-compatible). Used for documents, photos and generated
// PDFs. R2 exposes an S3 API, so we use the AWS SDK v3 pointed at the R2 endpoint.

import { S3Client } from '@aws-sdk/client-s3';
import { env, flags } from './env.js';

export const r2Ready = flags.r2Configured;

export const r2Client = r2Ready
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    })
  : null;

export const R2_BUCKET = env.r2.bucket;
export const R2_PUBLIC_URL = env.r2.publicUrl;

if (!r2Ready) {
  console.warn('[r2] Cloudflare R2 not configured. File upload/download routes will be disabled until R2_* env vars are set.');
}
