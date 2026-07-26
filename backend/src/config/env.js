// Centralized environment access. Import this instead of reading process.env
// directly, so defaults and parsing live in one place.

const bool = (v, fallback = false) =>
  v === undefined ? fallback : /^(1|true|yes)$/i.test(String(v));

const list = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 4000,

  corsOrigins: list(process.env.CORS_ORIGINS),

  firebase: {
    webApiKey: process.env.FIREBASE_WEB_API_KEY || '',
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT || '',
    sessionCookieDays: Number(process.env.SESSION_COOKIE_DAYS) || 5,
  },

  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  },
};

export const flags = {
  r2Configured: Boolean(
    env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket,
  ),
};

export { bool, list };
