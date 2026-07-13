// Roles are a domain concept (mirrored from Entra App Roles / security groups),
// so the authorization rule and the HTTP middleware can share one definition.
export const Roles = {
  Admin: 'Administrator', Ciso: 'CISO.RiskManager', RiskOwner: 'RiskOwner',
  ControlOwner: 'ControlOwner', Auditor: 'Auditor', Contributor: 'Contributor', Viewer: 'Viewer',
} as const;

/** Every recognized role — used to gate read access to authenticated principals. */
export const AnyRole = Object.values(Roles);

/** Roles with authority over any risk regardless of ownership. */
export const ELEVATED = [Roles.Admin, Roles.Ciso] as const;

export interface Actor { oid: string; roles: string[]; }

export function isElevated(roles: string[]): boolean {
  return roles.some(r => (ELEVATED as readonly string[]).includes(r));
}

/**
 * Object-level write authorization: elevated roles (Admin/CISO) may modify any
 * risk; everyone else may modify only risks they own or are a stakeholder of.
 * Pure and side-effect free so it is unit-testable in isolation.
 */
export function canModifyRisk(
  roles: string[],
  actorUserId: string | null,
  risk: { ownerId?: string; stakeholderIds: string[] }
): boolean {
  if (isElevated(roles)) return true;
  if (!actorUserId) return false;
  return risk.ownerId === actorUserId || risk.stakeholderIds.includes(actorUserId);
}
