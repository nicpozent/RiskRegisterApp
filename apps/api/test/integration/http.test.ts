import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { HAS_DB, pool, resetDb, seedUser } from './helpers.js';
import { RiskRepository } from '../../src/infrastructure/risk.repository.js';

// Replace the real Entra verifier: the bearer token IS a base64url-encoded
// principal, so tests can assert authz without minting real JWTs / hitting JWKS.
vi.mock('../../src/infrastructure/auth/entra.js', () => ({
  verifyToken: vi.fn(async (token: string) =>
    JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))),
}));

const tok = (p: object) => Buffer.from(JSON.stringify(p)).toString('base64url');
const bearer = (p: object) => `Bearer ${tok(p)}`;

const viewer      = { oid: 'v-oid', name: 'V', roles: ['Viewer'] };
const contributor = { oid: 'c-oid', name: 'C', roles: ['Contributor'] };
const admin       = { oid: 'a-oid', name: 'A', roles: ['Administrator'] };

const validBody = {
  title: 'Unencrypted backups', inherentL: 4, inherentI: 5, residualL: 2, residualI: 3,
  treatment: 'Mitigate' as const,
};

describe.skipIf(!HAS_DB)('HTTP API (integration)', () => {
  let app: Express;
  const repo = new RiskRepository(pool);

  beforeAll(async () => {
    // config/env is parsed on import; provide non-Entra dummies (verifier mocked).
    process.env.ENTRA_TENANT_ID ??= 'test-tenant';
    process.env.ENTRA_API_AUDIENCE ??= 'api://test';
    const mod = await import('../../src/interface/http.js');
    app = mod.buildApp();
  });
  afterAll(async () => { await pool.end(); });
  beforeEach(async () => { await resetDb(); });

  it('rejects an unauthenticated request (401)', async () => {
    await request(app).get('/risks').expect(401);
  });

  it('allows a read for any recognized role', async () => {
    const res = await request(app).get('/risks').set('Authorization', bearer(viewer)).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('paginates GET /risks and reports the total in X-Total-Count', async () => {
    for (let i = 0; i < 3; i++) await repo.insert({ ...validBody, status: 'open', stakeholderIds: [], controlIds: [] });
    const res = await request(app).get('/risks?limit=2&offset=0').set('Authorization', bearer(viewer)).expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.headers['x-total-count']).toBe('3');
  });

  it('rejects an invalid pagination query (400)', async () => {
    await request(app).get('/risks?limit=9999').set('Authorization', bearer(viewer)).expect(400);
  });

  it('denies a write to a read-only role (403)', async () => {
    await request(app).post('/risks').set('Authorization', bearer(viewer)).send(validBody).expect(403);
  });

  it('creates a risk for a write role and returns the computed view (201)', async () => {
    const res = await request(app).post('/risks').set('Authorization', bearer(contributor))
      .send(validBody).expect(201);
    expect(res.body).toMatchObject({ ref: expect.stringMatching(/^RR-\d{3}$/), residualBand: expect.any(String) });
  });

  it('regression(C1): PATCH cannot set status="accepted" (400)', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    await request(app).patch(`/risks/${created.body.id}`).set('Authorization', bearer(admin))
      .send({ status: 'accepted' }).expect(400);
  });

  it('restricts residual-risk acceptance to Admin/CISO (403 for contributor)', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    await request(app).post(`/risks/${created.body.id}/accept`).set('Authorization', bearer(contributor)).expect(403);
  });

  it('optimistic concurrency: stale If-Match is rejected with 409, fresh succeeds', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    const id = created.body.id;
    expect(created.body.version).toBe(0);

    // Correct version → applies, version bumps, new ETag returned.
    const first = await request(app).patch(`/risks/${id}`).set('Authorization', bearer(admin))
      .set('If-Match', '0').send({ title: 'Renamed once' }).expect(200);
    expect(first.body.version).toBe(1);
    expect(first.headers.etag).toBe('"1"');

    // Reusing the stale version 0 → conflict.
    await request(app).patch(`/risks/${id}`).set('Authorization', bearer(admin))
      .set('If-Match', '0').send({ title: 'Stale write' }).expect(409);

    // No If-Match → last-write-wins (backward compatible).
    await request(app).patch(`/risks/${id}`).set('Authorization', bearer(admin))
      .send({ title: 'Unconditional' }).expect(200);
  });

  it('rejects a non-integer If-Match (400)', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    await request(app).patch(`/risks/${created.body.id}`).set('Authorization', bearer(admin))
      .set('If-Match', 'not-a-number').send({ title: 'x' }).expect(400);
  });

  it('regression(H5): a non-owner contributor cannot modify someone else\'s risk (403)', async () => {
    const ownerId = await seedUser('owner-oid', 'owner@b.com');
    const risk = await repo.insert({ ...validBody, ownerId, status: 'open', stakeholderIds: [], controlIds: [] });
    await seedUser('other-oid', 'other@b.com');
    await request(app).patch(`/risks/${risk.id}`).set('Authorization', bearer({ oid: 'other-oid', roles: ['Contributor'] }))
      .send({ status: 'monitored' }).expect(403);
    // …but an elevated role may.
    await request(app).patch(`/risks/${risk.id}`).set('Authorization', bearer(admin))
      .send({ status: 'monitored' }).expect(200);
  });
});
