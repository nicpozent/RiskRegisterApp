import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { OIDC_ISSUER, JWKS_URI, env } from '../../config/env.js';

const jwks = createRemoteJWKSet(new URL(JWKS_URI));

export interface Principal { oid: string; name: string; roles: string[]; email?: string; }

/** Validate an Entra-issued access token: signature, issuer, audience, expiry. */
export async function verifyToken(token: string): Promise<Principal> {
  const { payload }: { payload: JWTPayload & Record<string, any> } =
    await jwtVerify(token, jwks, { issuer: OIDC_ISSUER, audience: env.ENTRA_API_AUDIENCE });
  // Access tokens usually carry preferred_username (UPN, email-shaped) rather
  // than an explicit email claim; use it best-effort for JIT provisioning.
  const email = String(payload.email ?? payload.preferred_username ?? payload.upn ?? '') || undefined;
  return {
    oid: String(payload.oid ?? payload.sub),
    name: String(payload.name ?? ''),
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    email,
  };
}
