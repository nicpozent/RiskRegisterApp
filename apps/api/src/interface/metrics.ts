import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Prometheus registry: default process/runtime metrics + an HTTP latency
// histogram. The `route` label uses the router mount (e.g. /risks), not the raw
// path, to keep cardinality bounded (no per-id label explosion).
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.baseUrl || req.path || 'unknown', status: res.statusCode });
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}
