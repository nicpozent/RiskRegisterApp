import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { HAS_DB, pool, resetDb, seedUser } from './helpers.js';

// Same verifier stub as the HTTP suite: the bearer token IS the base64url
// principal, so authz can be asserted without minting real JWTs.
vi.mock('../../src/infrastructure/auth/entra.js', () => ({
  verifyToken: vi.fn(async (token: string) =>
    JSON.parse(Buffer.from(token, 'base64url').toString('utf8'))),
}));

const bearer = (p: object) => `Bearer ${Buffer.from(JSON.stringify(p)).toString('base64url')}`;
const ENCRYPTED = !!process.env.DATA_ENCRYPTION_KEY || !!process.env.BAO_ADDR;

const admin   = { oid: 'padmin-oid', name: 'Admin', roles: ['Administrator'] };
const manager = { oid: 'mgr-oid', name: 'Manager', roles: ['Contributor'] }; // authority via manager_id, not role
const viewer  = { oid: 'view-oid', name: 'Viewer', roles: ['Viewer'] };

describe.skipIf(!HAS_DB)('personnel module (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    process.env.ENTRA_TENANT_ID ??= 'test-tenant';
    process.env.ENTRA_API_AUDIENCE ??= 'api://test';
    process.env.PERSONNEL_MODULE_ENABLED = 'true'; // ensure the router is mounted
    const mod = await import('../../src/interface/http.js');
    app = mod.buildApp();
  });
  afterAll(async () => { await pool.end(); });
  beforeEach(async () => { await resetDb(); });

  it('encrypts SWOT + dev-plans at rest and enforces manager/admin access', async () => {
    const managerId = await seedUser('mgr-oid', 'mgr@b.com', 'Manager M');
    const reportId  = await seedUser('rep-oid', 'rep@b.com', 'Report R');
    const outsider  = await seedUser('out-oid', 'out@b.com', 'Outsider O');

    // Admin creates a team managed by the manager, and adds the report to it.
    const team = (await request(app).post('/personnel/teams')
      .set('Authorization', bearer(admin)).send({ name: 'Alpha', managerId }).expect(201)).body;
    await request(app).post(`/personnel/teams/${team.id}/members`)
      .set('Authorization', bearer(admin)).send({ userId: reportId }).expect(204);

    // The manager may write their team's SWOT…
    await request(app).put(`/personnel/teams/${team.id}/swot`)
      .set('Authorization', bearer(manager))
      .send({ strengths: 'strong delivery', weaknesses: 'bus factor', opportunities: 'automation', threats: 'attrition' })
      .expect(200);

    // …stored as ciphertext at rest…
    if (ENCRYPTED) {
      const raw = await pool.query('SELECT strengths, threats FROM team_swot WHERE team_id = $1', [team.id]);
      expect(raw.rows[0].strengths).toMatch(/^l1:|^b1:/);
      expect(raw.rows[0].threats).toMatch(/^l1:|^b1:/);
      expect(raw.rows[0].strengths).not.toContain('delivery');
    }
    // …and readable as plaintext by the manager.
    const swot = (await request(app).get(`/personnel/teams/${team.id}/swot`)
      .set('Authorization', bearer(manager)).expect(200)).body;
    expect(swot.strengths).toBe('strong delivery');
    expect(swot.threats).toBe('attrition');

    // The manager may read/write the development plan of a member of their team.
    await request(app).put(`/personnel/users/${reportId}/devplan`)
      .set('Authorization', bearer(manager)).send({ content: 'Mentor towards tech-lead' }).expect(200);
    const dp = (await request(app).get(`/personnel/users/${reportId}/devplan`)
      .set('Authorization', bearer(manager)).expect(200)).body;
    expect(dp.content).toBe('Mentor towards tech-lead');
    if (ENCRYPTED) {
      const raw = await pool.query('SELECT content FROM development_plan WHERE user_id = $1', [reportId]);
      expect(raw.rows[0].content).toMatch(/^l1:|^b1:/);
      expect(raw.rows[0].content).not.toContain('Mentor');
    }

    // The manager is denied a non-report's dev plan and a team they don't manage.
    await request(app).get(`/personnel/users/${outsider}/devplan`).set('Authorization', bearer(manager)).expect(403);
    const beta = (await request(app).post('/personnel/teams')
      .set('Authorization', bearer(admin)).send({ name: 'Beta' }).expect(201)).body;
    await request(app).get(`/personnel/teams/${beta.id}/swot`).set('Authorization', bearer(manager)).expect(403);

    // A plain viewer is denied SWOT and sees no teams.
    await request(app).get(`/personnel/teams/${team.id}/swot`).set('Authorization', bearer(viewer)).expect(403);
    expect((await request(app).get('/personnel/teams').set('Authorization', bearer(viewer)).expect(200)).body).toEqual([]);

    // Admin sees all teams; the manager sees only the team they manage.
    expect((await request(app).get('/personnel/teams').set('Authorization', bearer(admin)).expect(200)).body).toHaveLength(2);
    const mine = (await request(app).get('/personnel/teams').set('Authorization', bearer(manager)).expect(200)).body;
    expect(mine.map((t: { id: string }) => t.id)).toEqual([team.id]);

    // Unknown team → 404, not 403.
    await request(app).get('/personnel/teams/00000000-0000-0000-0000-000000000000/swot')
      .set('Authorization', bearer(admin)).expect(404);
  });

  it('creating a team and managing membership is Admin/CISO only', async () => {
    await request(app).post('/personnel/teams').set('Authorization', bearer(manager)).send({ name: 'X' }).expect(403);
    await request(app).post('/personnel/teams').set('Authorization', bearer(viewer)).send({ name: 'X' }).expect(403);
  });
});
