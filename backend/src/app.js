// Express application assembly. Kept separate from the server entry so the same
// app can be exported for Vercel serverless (api/index.js) and run locally
// (server.js).

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { apiRouter } from './routes.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // needed on Vercel for secure cookies

  const allowedOrigins = env.corsOrigins;
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin/no-origin (curl, server-to-server) and configured origins.
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true, // required so the session cookie is sent cross-site
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
