import { describe, it, expect } from 'vitest';
import { canModifyRisk, isElevated, Roles } from './roles.js';

const risk = { ownerId: 'user-owner', stakeholderIds: ['user-stake'] };

describe('isElevated', () => {
  it('is true for Admin or CISO', () => {
    expect(isElevated([Roles.Admin])).toBe(true);
    expect(isElevated([Roles.Ciso])).toBe(true);
  });
  it('is false for non-elevated roles', () => {
    expect(isElevated([Roles.RiskOwner, Roles.Contributor])).toBe(false);
  });
});

describe('canModifyRisk (object-level authz)', () => {
  it('lets elevated roles modify any risk regardless of ownership', () => {
    expect(canModifyRisk([Roles.Ciso], null, risk)).toBe(true);
  });
  it('lets the owner modify their risk', () => {
    expect(canModifyRisk([Roles.RiskOwner], 'user-owner', risk)).toBe(true);
  });
  it('lets a stakeholder modify the risk', () => {
    expect(canModifyRisk([Roles.Contributor], 'user-stake', risk)).toBe(true);
  });
  it('denies a non-owner / non-stakeholder', () => {
    expect(canModifyRisk([Roles.Contributor], 'user-other', risk)).toBe(false);
  });
  it('denies when the actor cannot be resolved to a user', () => {
    expect(canModifyRisk([Roles.RiskOwner], null, risk)).toBe(false);
  });
});
