import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { HAS_DB, pool, resetDb, seedUser } from './helpers.js';
import { RiskRepository } from '../../src/infrastructure/risk.repository.js';
import { PersonnelRepository } from '../../src/infrastructure/personnel.repository.js';
import { exportSubject, eraseSubject, applyRetention } from '../../src/privacy/service.js';

const ENCRYPTED = !!process.env.DATA_ENCRYPTION_KEY || !!process.env.BAO_ADDR;

describe.skipIf(!HAS_DB)('privacy / GDPR tooling (integration)', () => {
  const repo = new RiskRepository(pool);
  afterAll(async () => { await pool.end(); });
  beforeEach(async () => { await resetDb(); });

  it.skipIf(!ENCRYPTED)('stores app_user PII as ciphertext at rest but resolves + exports plaintext', async () => {
    await seedUser('pii-oid', 'Person@B.com', 'Jane Doe');
    // At rest: display_name/email are ciphertext, entra_oid stays clear.
    const at = await pool.query(
      `SELECT display_name, email, email_bidx, entra_oid FROM app_user WHERE entra_oid = 'pii-oid'`);
    expect(at.rows[0].display_name).toMatch(/^l1:|^b1:/);
    expect(at.rows[0].email).toMatch(/^l1:|^b1:/);
    expect(at.rows[0].email_bidx).toBeTruthy();
    expect(at.rows[0].entra_oid).toBe('pii-oid');
    // Lookup by email works via the blind index (case/space-insensitive)…
    const data = await exportSubject(pool, { email: '  person@b.com ' });
    expect(data).not.toBeNull();
    // …and the export returns decrypted values.
    expect(data!.user.display_name).toBe('Jane Doe');
    expect(data!.user.email).toBe('Person@B.com');
  });

  it('exports a subject: user, owned risks and their audit events', async () => {
    const ownerId = await seedUser('subj-oid', 'subject@b.com', 'Subject User');
    await repo.insert({ title: 'Owned risk', inherentL: 3, inherentI: 3, residualL: 2, residualI: 2,
      treatment: 'Mitigate', status: 'open', ownerId, stakeholderIds: [], controlIds: [] });
    await pool.query(
      `INSERT INTO audit_event (actor_oid, action, entity, entity_id) VALUES ('subj-oid','created','risk','x')`);

    const data = await exportSubject(pool, { email: 'subject@b.com' });
    expect(data).not.toBeNull();
    expect(data!.user.entra_oid).toBe('subj-oid');
    expect(data!.ownedRisks).toHaveLength(1);
    expect(data!.auditEvents).toHaveLength(1);

    expect(await exportSubject(pool, { oid: 'nobody' })).toBeNull();
  });

  it('erases directly-identifying fields but keeps the row and audit trail', async () => {
    await seedUser('erase-oid', 'erase@b.com', 'To Erase');
    await pool.query(
      `INSERT INTO audit_event (actor_oid, action, entity, entity_id) VALUES ('erase-oid','modified','risk','y')`);

    const first = await eraseSubject(pool, { oid: 'erase-oid' });
    expect(first.status).toBe('erased');

    const { rows } = await pool.query('SELECT display_name, email, erased_at FROM app_user WHERE entra_oid = $1', ['erase-oid']);
    expect(rows[0].email).toBeNull();
    expect(rows[0].display_name).toBe('Erased subject');
    expect(rows[0].erased_at).not.toBeNull();
    // Audit trail is retained (legal-obligation basis).
    const audit = await pool.query(`SELECT count(*)::int n FROM audit_event WHERE actor_oid = 'erase-oid'`);
    expect(audit.rows[0].n).toBe(1);

    // Idempotent.
    expect((await eraseSubject(pool, { oid: 'erase-oid' })).status).toBe('already-erased');
    expect((await eraseSubject(pool, { oid: 'ghost' })).status).toBe('not-found');
  });

  it('DSAR export includes, and erasure deletes, personnel-module PII', async () => {
    const repo = new PersonnelRepository(pool);
    const subjectId = await seedUser('mem-oid', 'member@b.com', 'Team Member');
    const team = await repo.createTeam('Alpha', null);
    await repo.addMember(team.id, subjectId);
    await repo.upsertDevelopmentPlan(subjectId, 'Grow into a tech lead', subjectId);

    // Export surfaces the team membership + the (decrypted) development plan.
    const data = await exportSubject(pool, { oid: 'mem-oid' });
    expect(data!.teams).toEqual(['Alpha']);
    expect(data!.developmentPlan?.content).toBe('Grow into a tech lead');

    // Erasure deletes the dev plan and membership outright…
    expect((await eraseSubject(pool, { oid: 'mem-oid' })).status).toBe('erased');
    const dp = await pool.query('SELECT 1 FROM development_plan WHERE user_id = $1', [subjectId]);
    const mem = await pool.query('SELECT 1 FROM team_member WHERE user_id = $1', [subjectId]);
    expect(dp.rows).toHaveLength(0);
    expect(mem.rows).toHaveLength(0);
    // …and a subsequent export shows nothing left.
    const after = await exportSubject(pool, { oid: 'mem-oid' });
    expect(after!.teams).toEqual([]);
    expect(after!.developmentPlan).toBeNull();
  });

  it('retention purges old terminal notifications but keeps recent/queued ones', async () => {
    const ownerId = await seedUser('ret-oid', 'ret@b.com');
    const risk = await repo.insert({ title: 'R', inherentL: 3, inherentI: 3, residualL: 2, residualI: 2,
      treatment: 'Mitigate', status: 'open', ownerId, stakeholderIds: [], controlIds: [] });
    await pool.query(
      `INSERT INTO notification (risk_id, type, recipients, status, created_at)
       VALUES ($1,'risk.updated','[]'::jsonb,'sent', now() - interval '200 days'),
              ($1,'risk.updated','[]'::jsonb,'sent', now()),
              ($1,'risk.updated','[]'::jsonb,'queued', now() - interval '200 days')`, [risk.id]);

    const res = await applyRetention(pool, { notificationsDays: 90 });
    expect(res.notificationsDeleted).toBe(1); // only the old 'sent' one
    const remaining = await pool.query('SELECT count(*)::int n FROM notification');
    expect(remaining.rows[0].n).toBe(2);
  });
});
