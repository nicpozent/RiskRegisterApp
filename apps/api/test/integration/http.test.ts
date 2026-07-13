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

  it('exposes Prometheus metrics at /metrics', async () => {
    const res = await request(app).get('/metrics').expect(200);
    expect(res.text).toMatch(/http_request_duration_seconds|process_cpu_seconds_total/);
  });

  it('sets an X-Request-Id response header for correlation', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.headers['x-request-id']).toBeTruthy();
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

  it('paginates GET /controls with X-Total-Count', async () => {
    await pool.query(`INSERT INTO framework (id, name) VALUES ('iso27001','ISO 27001')`);
    for (const ref of ['A.5.1', 'A.5.2', 'A.5.3']) {
      await pool.query(`INSERT INTO control (framework, ref, title) VALUES ('iso27001',$1,$1)`, [ref]);
    }
    const res = await request(app).get('/controls?limit=2&offset=0').set('Authorization', bearer(viewer)).expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.headers['x-total-count']).toBe('3');
  });

  it('aggregates the register at GET /risks/summary', async () => {
    // Two risks: one residual High (L3×I3=9), one residual Low (L1×I2=2).
    await repo.insert({ ...validBody, residualL: 3, residualI: 3, treatment: 'Mitigate', status: 'open', stakeholderIds: [], controlIds: [] });
    await repo.insert({ ...validBody, residualL: 1, residualI: 2, treatment: 'Accept', status: 'monitored', stakeholderIds: [], controlIds: [] });
    const res = await request(app).get('/risks/summary').set('Authorization', bearer(viewer)).expect(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byResidualBand.High).toBe(1);
    expect(res.body.byResidualBand.Low).toBe(1);
    expect(res.body.byTreatment.Mitigate).toBe(1);
    expect(res.body.byStatus.monitored).toBe(1);
  });

  it('maps a control to a risk and lists it at GET /risks/:id/controls', async () => {
    await pool.query(`INSERT INTO framework (id, name) VALUES ('iso27001','ISO 27001')`);
    const ctrl = await pool.query(
      `INSERT INTO control (framework, ref, title) VALUES ('iso27001','A.8.24','Use of cryptography') RETURNING id`);
    const controlId = ctrl.rows[0].id;
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    const id = created.body.id;

    // Empty before mapping.
    const before = await request(app).get(`/risks/${id}/controls`).set('Authorization', bearer(viewer)).expect(200);
    expect(before.body).toHaveLength(0);

    await request(app).post(`/risks/${id}/controls/${controlId}`).set('Authorization', bearer(admin)).expect(204);

    const after = await request(app).get(`/risks/${id}/controls`).set('Authorization', bearer(viewer)).expect(200);
    expect(after.body).toHaveLength(1);
    expect(after.body[0]).toMatchObject({ ref: 'A.8.24', framework: 'iso27001' });
  });

  it('returns 404 listing controls for an unknown risk', async () => {
    await request(app).get('/risks/00000000-0000-0000-0000-000000000000/controls')
      .set('Authorization', bearer(viewer)).expect(404);
  });

  it('adds, lists and updates treatment actions on a risk', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    const id = created.body.id;

    const empty = await request(app).get(`/risks/${id}/actions`).set('Authorization', bearer(viewer)).expect(200);
    expect(empty.body).toHaveLength(0);

    const action = await request(app).post(`/risks/${id}/actions`).set('Authorization', bearer(admin))
      .send({ description: 'Encrypt nightly backups', dueDate: '2026-09-01' }).expect(201);
    expect(action.body).toMatchObject({ description: 'Encrypt nightly backups', status: 'open' });

    const listed = await request(app).get(`/risks/${id}/actions`).set('Authorization', bearer(viewer)).expect(200);
    expect(listed.body).toHaveLength(1);

    const done = await request(app).patch(`/risks/${id}/actions/${action.body.id}`).set('Authorization', bearer(admin))
      .send({ status: 'done' }).expect(200);
    expect(done.body.status).toBe('done');
  });

  it('rejects an invalid treatment-action status (400) and unknown risk (404)', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    await request(app).post(`/risks/${created.body.id}/actions`).set('Authorization', bearer(admin))
      .send({ description: 'A valid action description', status: 'bogus' }).expect(400);
    await request(app).get('/risks/00000000-0000-0000-0000-000000000000/actions')
      .set('Authorization', bearer(viewer)).expect(404);
  });

  it('exposes the audit trail to Auditor and denies a Viewer (403)', async () => {
    // A write generates an audit row.
    await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);

    await request(app).get('/admin/audit').set('Authorization', bearer(viewer)).expect(403);

    const auditor = { oid: 'au-oid', name: 'Au', roles: ['Auditor'] };
    const res = await request(app).get('/admin/audit?entity=risk').set('Authorization', bearer(auditor)).expect(200);
    expect(res.headers['x-total-count']).toBe('1');
    expect(res.body[0]).toMatchObject({ action: 'created', entity: 'risk' });
  });

  it('lists provisioned users for an admin and denies a contributor (403)', async () => {
    await seedUser('dir-oid', 'dir@b.com', 'Directory User');
    await request(app).get('/admin/users').set('Authorization', bearer(contributor)).expect(403);
    const res = await request(app).get('/admin/users').set('Authorization', bearer(admin)).expect(200);
    expect(res.body.map((u: { email: string }) => u.email)).toContain('dir@b.com');
  });

  it('exports the register as CSV', async () => {
    await request(app).post('/risks').set('Authorization', bearer(admin))
      .send({ ...validBody, title: 'Title, with comma' }).expect(201);
    const res = await request(app).get('/reports/register.csv').set('Authorization', bearer(viewer)).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/risk-register\.csv/);
    expect(res.text.split('\r\n')[0]).toBe(
      'ref,title,category,status,treatment,inherentScore,inherentBand,residualScore,residualBand,inherentAle,residualAle,reduction,nextReview');
    // A comma in the title must be quoted (RFC-4180), not split the row.
    expect(res.text).toContain('"Title, with comma"');
  });

  it('produces a per-risk evidence pack (404 for unknown)', async () => {
    const created = await request(app).post('/risks').set('Authorization', bearer(admin)).send(validBody).expect(201);
    const res = await request(app).get(`/reports/risk/${created.body.id}`).set('Authorization', bearer(viewer)).expect(200);
    expect(res.body).toMatchObject({ risk: { id: created.body.id }, controls: [], actions: [] });
    expect(res.body.generatedAt).toBeTruthy();
    await request(app).get('/reports/risk/00000000-0000-0000-0000-000000000000')
      .set('Authorization', bearer(viewer)).expect(404);
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
