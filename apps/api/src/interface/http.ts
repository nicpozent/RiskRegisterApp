import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from '../config/env.js';
import { authenticate } from './middleware/auth.js';
import { risks } from './routes/risks.js';
import { controls } from './routes/controls.js';
import { frameworks } from './routes/frameworks.js';
import { pool } from '../infrastructure/db.js';

export function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '256kb' }));
  app.use(pinoHttp());

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
  return app;
}
