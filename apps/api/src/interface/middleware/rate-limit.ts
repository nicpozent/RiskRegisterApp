import { Request, Response, NextFunction } from 'express';

/**
 * Minimal in-memory fixed-window rate limiter (no external dependency).
 * Per-process only — acceptable behind a small replica count; for large
 * fleets move this to a shared store (Redis) or the ingress layer.
 */
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + opts.windowMs });
      return next();
    }
    if (entry.count >= opts.max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: 'too many requests' });
    }
    entry.count++;
    next();
  };
}
