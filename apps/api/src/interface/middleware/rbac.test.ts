import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { requireRole, Roles, AnyRole } from './rbac.js';

function run(roles: string[] | undefined, allowed: string[]) {
  const req = { user: roles ? { roles } : undefined } as unknown as Request;
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const res = { status, json } as unknown as Response;
  const next = vi.fn();
  requireRole(...allowed)(req, res, next);
  return { next, status, json };
}

describe('requireRole (deny-by-default)', () => {
  it('allows a principal holding an accepted role', () => {
    const { next, status } = run([Roles.Ciso], [Roles.Admin, Roles.Ciso]);
    expect(next).toHaveBeenCalledOnce();
    expect(status).not.toHaveBeenCalled();
  });

  it('denies a principal with no matching role (403)', () => {
    const { next, status } = run([Roles.Viewer], [Roles.Admin, Roles.Ciso]);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('denies a token with an empty roles claim on read routes', () => {
    const { next, status } = run([], AnyRole);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });

  it('denies an unauthenticated request (no user)', () => {
    const { next, status } = run(undefined, AnyRole);
    expect(next).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(403);
  });
});
