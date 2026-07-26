// Local development entry point. On Vercel, api/index.js is used instead.

import 'dotenv/config';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`[server] College ERP backend listening on http://localhost:${env.port}`);
  console.log(`[server] env=${env.nodeEnv}`);
});
