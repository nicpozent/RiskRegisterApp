import { Request, Response, NextFunction } from 'express';
import { Roles, AnyRole } from '../../domain/roles.js';

// Re-export so route modules keep importing role helpers from one place.
export { Roles, AnyRole };

/** Deny-by-default: allow only if the principal holds one of the required roles. */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roles = req.user?.roles ?? [];
    if (roles.some(r => allowed.includes(r))) return next();
    res.status(403).json({ error: 'forbidden', need: allowed });
  };
}
