import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb, seedUser } from './helpers.js';
import { RiskRepository } from '../../src/infrastructure/risk.repository.js';

const base = {
  title: 'Unencrypted backups', description: 'd', category: 'c',
  inherentL: 4, inherentI: 5, residualL: 2, residualI: 3,
  treatment: 'Mitigate' as const, status: 'open' as const,
  stakeholderIds: [] as string[], controlIds: [] as string[],
};

describe.skipIf(!HAS_DB)('RiskRepository (integration)', () => {
  const repo = new RiskRepository(pool);
  beforeAll(async () => { await resetDb(); });
  beforeEach(async () => { await resetDb(); });
  afterAll(async () => { await pool.end(); });

  it('mints sequential, zero-padded refs from the sequence', async () => {
    const a = await repo.insert({ ...base });
    const b = await repo.insert({ ...base, title: 'Second risk' });
    expect(a.ref).toBe('RR-001');
    expect(b.ref).toBe('RR-002');
  });

  it('regression(H2): concurrent inserts never collide on ref', async () => {
    const created = await Promise.all(
      Array.from({ length: 10 }, (_, i) => repo.insert({ ...base, title: `R${i}` })));
    const refs = created.map(r => r.ref);
    expect(new Set(refs).size).toBe(10);            // all unique, no race
  });

  it('round-trips fields and hydrates relations', async () => {
    const r = await repo.insert({ ...base });
    const got = await repo.findById(r.id);
    expect(got?.title).toBe(base.title);
    expect(got?.inherentL).toBe(4);
    expect(got?.controlIds).toEqual([]);
  });

  it('updates only whitelisted columns and bumps version', async () => {
    const r = await repo.insert({ ...base });
    expect(r.version).toBe(0);
    const updated = await repo.update(r.id, { status: 'monitored', title: 'Renamed' });
    expect(updated?.status).toBe('monitored');
    expect(updated?.title).toBe('Renamed');
    expect(updated?.version).toBe(1);
  });

  it('updateIfVersion applies on match, reports conflict on mismatch, notfound if absent', async () => {
    const r = await repo.insert({ ...base });
    const ok = await repo.updateIfVersion(r.id, { title: 'v1' }, 0);
    expect(typeof ok === 'object' && ok.version).toBe(1);
    expect(await repo.updateIfVersion(r.id, { title: 'stale' }, 0)).toBe('conflict');
    expect(await repo.updateIfVersion('00000000-0000-0000-0000-000000000000', { title: 'x' }, 0)).toBe('notfound');
  });

  it('resolves an Entra oid to the internal app_user id', async () => {
    const uid = await seedUser('oid-123', 'a@b.com');
    expect(await repo.userIdByOid('oid-123')).toBe(uid);
    expect(await repo.userIdByOid('missing')).toBeNull();
  });

  it('ensureUser upserts idempotently and preserves email on a null claim', async () => {
    const id1 = await repo.ensureUser({ oid: 'u1', name: 'U One', email: 'u1@b.com' });
    const id2 = await repo.ensureUser({ oid: 'u1', name: 'U One Renamed' }); // no email claim
    expect(id2).toBe(id1);
    const { rows } = await pool.query(`SELECT display_name, email FROM app_user WHERE entra_oid='u1'`);
    expect(rows).toHaveLength(1);
    expect(rows[0].display_name).toBe('U One Renamed');
    expect(rows[0].email).toBe('u1@b.com');   // preserved via COALESCE
  });

  it('counts and paginates in ref order', async () => {
    for (let i = 0; i < 5; i++) await repo.insert({ ...base, title: `R${i}` });
    expect(await repo.count()).toBe(5);
    const page1 = await repo.findAll(2, 0);
    const page2 = await repo.findAll(2, 2);
    expect(page1.map(r => r.ref)).toEqual(['RR-001', 'RR-002']);
    expect(page2.map(r => r.ref)).toEqual(['RR-003', 'RR-004']);
  });

  it('batch-hydrates relations to the correct risk (no N+1 cross-talk)', async () => {
    const withStake = await repo.insert({ ...base, title: 'Has stakeholder' });
    const without = await repo.insert({ ...base, title: 'No stakeholder' });
    const uid = await seedUser('stake-oid', 'stake@b.com');
    await pool.query('INSERT INTO risk_stakeholder (risk_id, user_id) VALUES ($1,$2)', [withStake.id, uid]);

    const all = await repo.findAll(50, 0);
    const a = all.find(r => r.id === withStake.id)!;
    const b = all.find(r => r.id === without.id)!;
    expect(a.stakeholderIds).toEqual([uid]);
    expect(b.stakeholderIds).toEqual([]);
  });
});
