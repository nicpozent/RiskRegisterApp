import express, { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';
import { authenticate } from './middleware/auth.js';
import { rateLimit } from './middleware/rate-limit.js';
import { risks } from './routes/risks.js';
import { controls } from './routes/controls.js';
import { frameworks } from './routes/frameworks.js';
import { pool } from '../infrastructure/db.js';
import { HttpError } from '../application/errors.js';

export function buildApp() {
  const app = express();
  // Behind the nginx/ingress edge — trust one proxy hop so req.ip is the client.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  // Bearer tokens are sent in the Authorization header, not cookies — no credentials.
  app.use(cors({ origin: env.CORS_ORIGIN, exposedHeaders: ['X-Total-Count', 'ETag'] }));
  app.use(express.json({ limit: '256kb' }));
  // Never log bearer tokens / cookies.
  app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie'] }));
  app.use(rateLimit({ windowMs: 60_000, max: 300 }));

  app.get('/healthz', (_req, res) => res.json({ ok: true }));
  app.get('/readyz', async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ ready: true }); }
    catch { res.status(503).json({ ready: false }); }
  });

  // Everything below requires a valid Entra token.
  app.use('/risks', authenticate, risks);
  app.use('/controls', authenticate, controls);
  app.use('/frameworks', authenticate, frameworks);

  app.use((_req, res) => res.status(404).json({ error: 'not found' }));

  // Terminal error handler — known HttpErrors map to their status; everything
  // else is logged and returned as a sanitized 500.
  const onError: ErrorRequestHandler = (err, req, res, _next) => {
    if (res.headersSent) return;
    if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    req.log?.error({ err }, 'unhandled error');
    res.status(500).json({ error: 'internal error' });
  };
  app.use(onError);
  return app;
}
