import { Request, Response, NextFunction } from 'express';

// App roles, mirrored from Entra App Roles / security groups.
export const Roles = {
  Admin: 'Administrator', Ciso: 'CISO.RiskManager', RiskOwner: 'RiskOwner',
  ControlOwner: 'ControlOwner', Auditor: 'Auditor', Contributor: 'Contributor', Viewer: 'Viewer',
} as const;

/** Every recognized role — used to gate read access to authenticated principals. */
export const AnyRole = Object.values(Roles);

/** Deny-by-default: allow only if the principal holds one of the required roles. */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roles = req.user?.roles ?? [];
    if (roles.some(r => allowed.includes(r))) return next();
    res.status(403).json({ error: 'forbidden', need: allowed });
  };
}
