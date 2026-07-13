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

  it('updates only whitelisted columns', async () => {
    const r = await repo.insert({ ...base });
    const updated = await repo.update(r.id, { status: 'monitored', title: 'Renamed' });
    expect(updated?.status).toBe('monitored');
    expect(updated?.title).toBe('Renamed');
  });

  it('resolves an Entra oid to the internal app_user id', async () => {
    const uid = await seedUser('oid-123', 'a@b.com');
    expect(await repo.userIdByOid('oid-123')).toBe(uid);
    expect(await repo.userIdByOid('missing')).toBeNull();
  });
});
