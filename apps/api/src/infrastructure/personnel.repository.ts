import type { Queryable } from './db.js';
import { getEncryptor } from '@rr/crypto';

// Personnel module data access. SWOT quadrants and development-plan content are
// sensitive PII and are encrypted at rest via @rr/crypto: encrypted on write,
// decrypted on read, so the rest of the app only sees plaintext. Team names and
// membership stay in clear so the directory is queryable.

export interface Team { id: string; name: string; managerId: string | null; createdAt: string; }
export interface TeamMember { userId: string; displayName: string; }
export interface Swot { strengths: string; weaknesses: string; opportunities: string; threats: string; }
export interface DevelopmentPlan { userId: string; content: string; updatedAt: string | null; }

const EMPTY_SWOT: Swot = { strengths: '', weaknesses: '', opportunities: '', threats: '' };

export class PersonnelRepository {
  constructor(private db: Queryable) {}

  // ---- Teams ----
  async listTeams(): Promise<Team[]> {
    const { rows } = await this.db.query(
      `SELECT id, name, manager_id as "managerId", created_at as "createdAt" FROM team ORDER BY name`);
    return rows;
  }

  /** Teams a given user manages (manager_id = them). */
  async teamsManagedBy(userId: string): Promise<Team[]> {
    const { rows } = await this.db.query(
      `SELECT id, name, manager_id as "managerId", created_at as "createdAt"
         FROM team WHERE manager_id = $1 ORDER BY name`, [userId]);
    return rows;
  }

  async createTeam(name: string, managerId: string | null): Promise<Team> {
    const { rows } = await this.db.query(
      `INSERT INTO team (name, manager_id) VALUES ($1, $2)
         RETURNING id, name, manager_id as "managerId", created_at as "createdAt"`, [name, managerId]);
    return rows[0];
  }

  async teamExists(teamId: string): Promise<boolean> {
    const { rows } = await this.db.query('SELECT 1 FROM team WHERE id = $1', [teamId]);
    return rows.length > 0;
  }

  async managerOf(teamId: string): Promise<string | null> {
    const { rows } = await this.db.query('SELECT manager_id FROM team WHERE id = $1', [teamId]);
    return rows.length ? (rows[0].manager_id ?? null) : null;
  }

  // ---- Membership ----
  async listMembers(teamId: string): Promise<TeamMember[]> {
    const enc = getEncryptor();
    const { rows } = await this.db.query(
      `SELECT u.id as "userId", u.display_name as "displayName"
         FROM team_member m JOIN app_user u ON u.id = m.user_id
        WHERE m.team_id = $1`, [teamId]);
    const members = await Promise.all(rows.map(async (r) => ({
      userId: r.userId, displayName: await enc.decrypt(r.displayName),
    })));
    members.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return members;
  }

  async addMember(teamId: string, userId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO team_member (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [teamId, userId]);
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    await this.db.query('DELETE FROM team_member WHERE team_id = $1 AND user_id = $2', [teamId, userId]);
  }

  /** True if userId is a member of any team managed by managerId. */
  async managerHasReport(managerId: string, userId: string): Promise<boolean> {
    const { rows } = await this.db.query(
      `SELECT 1 FROM team_member m JOIN team t ON t.id = m.team_id
        WHERE t.manager_id = $1 AND m.user_id = $2 LIMIT 1`, [managerId, userId]);
    return rows.length > 0;
  }

  // ---- SWOT (encrypted at rest) ----
  async getSwot(teamId: string): Promise<Swot> {
    const { rows } = await this.db.query(
      `SELECT strengths, weaknesses, opportunities, threats FROM team_swot WHERE team_id = $1`, [teamId]);
    if (!rows.length) return { ...EMPTY_SWOT };
    const enc = getEncryptor();
    const r = rows[0];
    return {
      strengths: await enc.decrypt(r.strengths ?? ''),
      weaknesses: await enc.decrypt(r.weaknesses ?? ''),
      opportunities: await enc.decrypt(r.opportunities ?? ''),
      threats: await enc.decrypt(r.threats ?? ''),
    };
  }

  async upsertSwot(teamId: string, swot: Swot, updatedBy: string | null): Promise<void> {
    const enc = getEncryptor();
    const [s, w, o, t] = await Promise.all([
      enc.encrypt(swot.strengths), enc.encrypt(swot.weaknesses),
      enc.encrypt(swot.opportunities), enc.encrypt(swot.threats),
    ]);
    await this.db.query(
      `INSERT INTO team_swot (team_id, strengths, weaknesses, opportunities, threats, updated_at, updated_by)
         VALUES ($1, $2, $3, $4, $5, now(), $6)
       ON CONFLICT (team_id) DO UPDATE
         SET strengths = EXCLUDED.strengths, weaknesses = EXCLUDED.weaknesses,
             opportunities = EXCLUDED.opportunities, threats = EXCLUDED.threats,
             updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [teamId, s, w, o, t, updatedBy]);
  }

  // ---- Development plans (encrypted at rest) ----
  async getDevelopmentPlan(userId: string): Promise<DevelopmentPlan> {
    const { rows } = await this.db.query(
      `SELECT content, updated_at as "updatedAt" FROM development_plan WHERE user_id = $1`, [userId]);
    if (!rows.length) return { userId, content: '', updatedAt: null };
    return { userId, content: await getEncryptor().decrypt(rows[0].content ?? ''), updatedAt: rows[0].updatedAt };
  }

  async upsertDevelopmentPlan(userId: string, content: string, updatedBy: string | null): Promise<void> {
    const enc = getEncryptor();
    const ct = await enc.encrypt(content);
    await this.db.query(
      `INSERT INTO development_plan (user_id, content, updated_at, updated_by)
         VALUES ($1, $2, now(), $3)
       ON CONFLICT (user_id) DO UPDATE
         SET content = EXCLUDED.content, updated_at = now(), updated_by = EXCLUDED.updated_by`,
      [userId, ct, updatedBy]);
  }
}
