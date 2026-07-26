// Vercel serverless entry point. Vercel routes all requests here (see vercel.json)
// and this exports the Express app as the request handler. Env vars come from
// Vercel Project Settings, so no dotenv here.

import { createApp } from '../src/app.js';

const app = createApp();

export default app;
