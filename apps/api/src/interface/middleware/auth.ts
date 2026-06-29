import { Request, Response, NextFunction } from 'express';
import { verifyToken, Principal } from '../../infrastructure/auth/entra.js';

declare global { namespace Express { interface Request { user?: Principal } } }

/** Require a valid Entra bearer token on every protected route. */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing bearer token' });
  try {
    req.user = await verifyToken(h.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}
