import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb, seedUser } from './helpers.js';
import { RiskRepository } from '../../src/infrastructure/risk.repository.js';
import { RiskService } from '../../src/application/risk.service.js';
import { HttpError } from '../../src/application/errors.js';
import { Roles } from '../../src/domain/roles.js';

const baseRisk = {
  title: 'Owned risk', inherentL: 3, inherentI: 3, residualL: 2, residualI: 2,
  treatment: 'Mitigate' as const, status: 'open' as const,
  stakeholderIds: [] as string[], controlIds: [] as string[],
};

describe.skipIf(!HAS_DB)('object-level authorization (integration)', () => {
  const svc = new RiskService(pool);
  const repo = new RiskRepository(pool);
  afterAll(async () => { await pool.end(); });

  async function ownedRisk() {
    const ownerId = await seedUser('owner-oid', 'owner@b.com');
    const risk = await repo.insert({ ...baseRisk, ownerId });
    return { ownerId, risk };
  }

  beforeEach(async () => { await resetDb(); });

  it('lets the owner update their own risk', async () => {
    const { risk } = await ownedRisk();
    const res = await svc.update(risk.id, { status: 'monitored' },
      { oid: 'owner-oid', roles: [Roles.RiskOwner] });
    expect(res?.status).toBe('monitored');
  });

  it('regression(H5): denies a non-owner/non-stakeholder contributor (403)', async () => {
    const { risk } = await ownedRisk();
    await seedUser('other-oid', 'other@b.com');
    await expect(
      svc.update(risk.id, { status: 'monitored' }, { oid: 'other-oid', roles: [Roles.Contributor] })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('lets an elevated CISO update any risk', async () => {
    const { risk } = await ownedRisk();
    const res = await svc.update(risk.id, { status: 'treating' },
      { oid: 'ciso-oid', roles: [Roles.Ciso] });
    expect(res?.status).toBe('treating');
  });

  it('writes an append-only audit row on a successful change', async () => {
    const { risk } = await ownedRisk();
    await svc.update(risk.id, { status: 'monitored' }, { oid: 'owner-oid', roles: [Roles.RiskOwner] });
    const { rows } = await pool.query(
      `SELECT action FROM audit_event WHERE entity='risk' AND entity_id=$1`, [risk.id]);
    expect(rows.map(r => r.action)).toContain('modified');
  });

  it('surfaces denial as a typed HttpError', async () => {
    const { risk } = await ownedRisk();
    await seedUser('x-oid', 'x@b.com');
    try {
      await svc.update(risk.id, { title: 'x' }, { oid: 'x-oid', roles: [Roles.Contributor] });
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
    }
  });
});
