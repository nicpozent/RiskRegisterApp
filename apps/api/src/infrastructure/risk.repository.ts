import { Risk } from '../domain/risk.js';
import type { Queryable } from './db.js';

/** Raw grouped aggregates from the DB; the service maps scores → bands. */
export interface RiskSummaryRaw {
  total: number;
  inherentAle: number;
  residualAle: number;
  byStatus: { status: string; n: number }[];
  byTreatment: { treatment: string; n: number }[];
  inherentScores: { s: number; n: number }[];
  residualScores: { s: number; n: number }[];
}

const COLS = `id, ref, title, description, category, owner_id as "ownerId",
  inherent_l as "inherentL", inherent_i as "inherentI",
  residual_l as "residualL", residual_i as "residualI",
  treatment, status, sle, aro, residual_aro as "residualAro", next_review as "nextReview", version`;

const COL_MAP: Record<string, string> = { title:'title', description:'description', category:'category',
  ownerId:'owner_id', inherentL:'inherent_l', inherentI:'inherent_i', residualL:'residual_l',
  residualI:'residual_i', treatment:'treatment', status:'status', sle:'sle', aro:'aro',
  residualAro:'residual_aro', nextReview:'next_review' };

export class RiskRepository {
  constructor(private db: Queryable) {}

  /** Attach controlIds/stakeholderIds to many rows in 2 queries total (no N+1). */
  private async hydrateMany(rows: any[]): Promise<Risk[]> {
    if (rows.length === 0) return [];
    const ids = rows.map(r => r.id);
    const [ctrls, stake] = await Promise.all([
      this.db.query('SELECT risk_id, control_id FROM risk_control WHERE risk_id = ANY($1)', [ids]),
      this.db.query('SELECT risk_id, user_id FROM risk_stakeholder WHERE risk_id = ANY($1)', [ids]),
    ]);
    const group = (qrows: any[], key: string) => {
      const m = new Map<string, string[]>();
      for (const r of qrows) {
        const arr = m.get(r.risk_id);
        if (arr) arr.push(r[key]); else m.set(r.risk_id, [r[key]]);
      }
      return m;
    };
    const byControl = group(ctrls.rows, 'control_id');
    const byStake = group(stake.rows, 'user_id');
    return rows.map(row => ({
      ...row,
      controlIds: byControl.get(row.id) ?? [],
      stakeholderIds: byStake.get(row.id) ?? [],
    }));
  }

  private async hydrate(row: any): Promise<Risk> {
    return (await this.hydrateMany([row]))[0];
  }

  async count(): Promise<number> {
    const { rows } = await this.db.query('SELECT count(*)::int n FROM risk');
    return rows[0].n;
  }

  /**
   * Register-wide aggregates for the dashboard, computed in the database
   * (GROUP BY) so it stays cheap as the register grows. Scores are returned
   * raw; the service maps them to bands via the single-source domain thresholds
   * so the SQL never duplicates the band boundaries.
   */
  async summary(): Promise<RiskSummaryRaw> {
    const [totals, byStatus, byTreatment, inh, res] = await Promise.all([
      this.db.query(`SELECT count(*)::int total,
          COALESCE(SUM(sle * aro), 0)::float "inherentAle",
          COALESCE(SUM(sle * residual_aro), 0)::float "residualAle" FROM risk`),
      this.db.query(`SELECT status, count(*)::int n FROM risk GROUP BY status`),
      this.db.query(`SELECT treatment, count(*)::int n FROM risk GROUP BY treatment`),
      this.db.query(`SELECT (inherent_l * inherent_i) s, count(*)::int n FROM risk GROUP BY s`),
      this.db.query(`SELECT (residual_l * residual_i) s, count(*)::int n FROM risk GROUP BY s`),
    ]);
    return {
      total: totals.rows[0].total,
      inherentAle: totals.rows[0].inherentAle,
      residualAle: totals.rows[0].residualAle,
      byStatus: byStatus.rows,
      byTreatment: byTreatment.rows,
      inherentScores: inh.rows,
      residualScores: res.rows,
    };
  }

  async findAll(limit = 50, offset = 0): Promise<Risk[]> {
    const { rows } = await this.db.query(
      `SELECT ${COLS} FROM risk ORDER BY ref LIMIT $1 OFFSET $2`, [limit, offset]);
    return this.hydrateMany(rows);
  }
  async findById(id: string): Promise<Risk | null> {
    const { rows } = await this.db.query(`SELECT ${COLS} FROM risk WHERE id=$1`, [id]);
    return rows[0] ? this.hydrate(rows[0]) : null;
  }
  async insert(r: Omit<Risk,'id'|'ref'|'version'>): Promise<Risk> {
    const ref = await this.nextRef();
    const { rows } = await this.db.query(
      `INSERT INTO risk (ref,title,description,category,owner_id,inherent_l,inherent_i,
          residual_l,residual_i,treatment,status,sle,aro,residual_aro,next_review)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING ${COLS}`,
      [ref, r.title, r.description, r.category, r.ownerId, r.inherentL, r.inherentI,
       r.residualL, r.residualI, r.treatment, r.status, r.sle, r.aro, r.residualAro, r.nextReview]
    );
    const created = await this.hydrate(rows[0]);
    for (const cid of r.controlIds ?? []) await this.linkControl(created.id, cid);
    return created;
  }
  /** Build `col=$n` assignments for the whitelisted patch fields. */
  private buildSets(p: Partial<Risk>, vals: unknown[]): string[] {
    const sets: string[] = [];
    for (const [k, col] of Object.entries(COL_MAP)) {
      if (k in p) { vals.push((p as any)[k]); sets.push(`${col}=$${vals.length}`); }
    }
    return sets;
  }

  /** Last-write-wins update (bumps version). */
  async update(id: string, p: Partial<Risk>): Promise<Risk | null> {
    const vals: unknown[] = [];
    const sets = this.buildSets(p, vals);
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await this.db.query(
      `UPDATE risk SET ${sets.join(',')}, version=version+1, updated_at=now() WHERE id=$${vals.length}`, vals);
    return this.findById(id);
  }

  /**
   * Optimistic-concurrency update: only applies if the row's current version
   * equals expectedVersion. Returns 'notfound' | 'conflict' | the updated Risk.
   * The conditional WHERE makes the check-and-set atomic (no TOCTOU).
   */
  async updateIfVersion(id: string, p: Partial<Risk>, expectedVersion: number): Promise<'notfound' | 'conflict' | Risk> {
    const vals: unknown[] = [];
    const sets = this.buildSets(p, vals);
    vals.push(id); const idParam = vals.length;
    vals.push(expectedVersion); const verParam = vals.length;
    const assignments = [...sets, 'version = version + 1', 'updated_at = now()'].join(', ');
    const res = await this.db.query(
      `UPDATE risk SET ${assignments} WHERE id=$${idParam} AND version=$${verParam}`, vals);
    if ((res as any).rowCount > 0) return (await this.findById(id))!;
    const cur = await this.db.query('SELECT 1 FROM risk WHERE id=$1', [id]);
    return cur.rows.length ? 'conflict' : 'notfound';
  }
  /** Resolve an Entra object id to the internal app_user id (null if unknown). */
  async userIdByOid(oid: string): Promise<string | null> {
    const { rows } = await this.db.query('SELECT id FROM app_user WHERE entra_oid=$1', [oid]);
    return rows[0]?.id ?? null;
  }

  /**
   * Just-in-time provision the acting principal into app_user (upsert by
   * entra_oid). Keeps display_name fresh; only overwrites email when a new one
   * is present so a directory-synced address isn't clobbered by a null claim.
   */
  async ensureUser(p: { oid: string; name?: string; email?: string }): Promise<string> {
    const { rows } = await this.db.query(
      `INSERT INTO app_user (entra_oid, display_name, email) VALUES ($1,$2,$3)
         ON CONFLICT (entra_oid) DO UPDATE
           SET display_name = EXCLUDED.display_name,
               email = COALESCE(EXCLUDED.email, app_user.email)
         RETURNING id`,
      [p.oid, p.name || p.oid, p.email ?? null]);
    return rows[0].id;
  }
  /** Controls currently mapped to a risk (joined to the catalogue). */
  async controlsFor(riskId: string) {
    const { rows } = await this.db.query(
      `SELECT c.id, c.framework, c.ref, c.title, c.grp as "group", c.help, c.is_custom as "isCustom"
         FROM risk_control rc JOIN control c ON c.id = rc.control_id
        WHERE rc.risk_id = $1 ORDER BY c.framework, c.ref`, [riskId]);
    return rows;
  }
  async linkControl(riskId: string, controlId: string) {
    await this.db.query(
      `INSERT INTO risk_control (risk_id, control_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [riskId, controlId]);
  }
  // ---- Treatment actions (risk-scoped tasks) ----
  private static readonly ACTION_COLS = `id, risk_id as "riskId", description, owner_id as "ownerId",
    due_date as "dueDate", status, created_at as "createdAt", updated_at as "updatedAt"`;

  async actionsFor(riskId: string) {
    const { rows } = await this.db.query(
      `SELECT ${RiskRepository.ACTION_COLS} FROM treatment_action
        WHERE risk_id = $1 ORDER BY created_at`, [riskId]);
    return rows;
  }
  async insertAction(riskId: string, a: { description: string; ownerId?: string; dueDate?: string; status?: string }) {
    const { rows } = await this.db.query(
      `INSERT INTO treatment_action (risk_id, description, owner_id, due_date, status)
         VALUES ($1,$2,$3,$4,COALESCE($5,'open')) RETURNING ${RiskRepository.ACTION_COLS}`,
      [riskId, a.description, a.ownerId ?? null, a.dueDate ?? null, a.status ?? null]);
    return rows[0];
  }
  /** Patch an action scoped to its risk (whitelisted fields). Null if not found. */
  async updateAction(riskId: string, actionId: string, p: { description?: string; ownerId?: string; dueDate?: string; status?: string }) {
    const map: Record<string, string> = { description:'description', ownerId:'owner_id', dueDate:'due_date', status:'status' };
    const vals: unknown[] = []; const sets: string[] = [];
    for (const [k, col] of Object.entries(map)) {
      if (k in p) { vals.push((p as Record<string, unknown>)[k]); sets.push(`${col}=$${vals.length}`); }
    }
    vals.push(riskId); const riskParam = vals.length;
    vals.push(actionId); const idParam = vals.length;
    const assignments = [...sets, 'updated_at = now()'].join(', ');
    const { rows } = await this.db.query(
      `UPDATE treatment_action SET ${assignments}
        WHERE risk_id=$${riskParam} AND id=$${idParam} RETURNING ${RiskRepository.ACTION_COLS}`, vals);
    return rows[0] ?? null;
  }

  private async nextRef(): Promise<string> {
    // Atomic — no race or reuse under concurrent inserts (see migration 0002).
    const { rows } = await this.db.query(`SELECT nextval('risk_ref_seq')::int n`);
    return 'RR-' + String(rows[0].n).padStart(3, '0');
  }
}
