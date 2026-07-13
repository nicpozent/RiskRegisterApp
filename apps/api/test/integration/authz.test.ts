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

  it('create writes risk + audit + queued notification atomically', async () => {
    const view = await svc.create({ ...baseRisk }, 'creator-oid');
    const a = await pool.query(
      `SELECT count(*)::int n FROM audit_event WHERE entity='risk' AND entity_id=$1 AND action='created'`, [view.id]);
    const n = await pool.query(`SELECT count(*)::int n FROM notification WHERE risk_id=$1`, [view.id]);
    expect(a.rows[0].n).toBe(1);
    expect(n.rows[0].n).toBe(1);
  });

  it('a denied update writes no audit or notification row (transaction/ordering)', async () => {
    const { risk } = await ownedRisk();
    await seedUser('nope-oid', 'nope@b.com');
    await expect(
      svc.update(risk.id, { status: 'monitored' }, { oid: 'nope-oid', roles: [Roles.Contributor] })
    ).rejects.toMatchObject({ status: 403 });
    const a = await pool.query(
      `SELECT count(*)::int n FROM audit_event WHERE entity='risk' AND entity_id=$1 AND action='modified'`, [risk.id]);
    const n = await pool.query(`SELECT count(*)::int n FROM notification WHERE risk_id=$1`, [risk.id]);
    expect(a.rows[0].n).toBe(0);
    expect(n.rows[0].n).toBe(0);
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
