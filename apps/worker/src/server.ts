import { createServer, type Server, type ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { registry } from './metrics.js';

/**
 * Tiny health/metrics endpoint for the worker (Node's built-in http — no extra
 * web framework). Exposes:
 *   GET /healthz  — liveness (process is up)
 *   GET /readyz   — readiness (DB reachable)
 *   GET /metrics  — Prometheus scrape (internal only)
 */
export function startHealthServer(db: Pool, port: number): Server {
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method !== 'GET') return json(res, 405, { error: 'method not allowed' });

    if (path === '/healthz') return json(res, 200, { ok: true });
    if (path === '/readyz') {
      db.query('SELECT 1')
        .then(() => json(res, 200, { ready: true }))
        .catch(() => json(res, 503, { ready: false }));
      return;
    }
    if (path === '/metrics') {
      registry.metrics().then((body) => {
        res.writeHead(200, { 'Content-Type': registry.contentType });
        res.end(body);
      });
      return;
    }
    return json(res, 404, { error: 'not found' });
  });

  server.listen(port, () => console.log(`worker health/metrics listening on :${port}`));
  return server;
}
