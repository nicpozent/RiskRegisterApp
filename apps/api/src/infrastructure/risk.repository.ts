import { Risk } from '../domain/risk.js';
import type { Queryable } from './db.js';

const COLS = `id, ref, title, description, category, owner_id as "ownerId",
  inherent_l as "inherentL", inherent_i as "inherentI",
  residual_l as "residualL", residual_i as "residualI",
  treatment, status, sle, aro, residual_aro as "residualAro", next_review as "nextReview"`;

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

  async findAll(limit = 50, offset = 0): Promise<Risk[]> {
    const { rows } = await this.db.query(
      `SELECT ${COLS} FROM risk ORDER BY ref LIMIT $1 OFFSET $2`, [limit, offset]);
    return this.hydrateMany(rows);
  }
  async findById(id: string): Promise<Risk | null> {
    const { rows } = await this.db.query(`SELECT ${COLS} FROM risk WHERE id=$1`, [id]);
    return rows[0] ? this.hydrate(rows[0]) : null;
  }
  async insert(r: Omit<Risk,'id'|'ref'>): Promise<Risk> {
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
  async update(id: string, p: Partial<Risk>): Promise<Risk | null> {
    const map: Record<string,string> = { title:'title', description:'description', category:'category',
      ownerId:'owner_id', inherentL:'inherent_l', inherentI:'inherent_i', residualL:'residual_l',
      residualI:'residual_i', treatment:'treatment', status:'status', sle:'sle', aro:'aro',
      residualAro:'residual_aro', nextReview:'next_review' };
    const sets: string[] = []; const vals: any[] = [];
    for (const [k, col] of Object.entries(map)) if (k in p) { vals.push((p as any)[k]); sets.push(`${col}=$${vals.length}`); }
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await this.db.query(`UPDATE risk SET ${sets.join(',')}, updated_at=now() WHERE id=$${vals.length}`, vals);
    return this.findById(id);
  }
  /** Resolve an Entra object id to the internal app_user id (null if unknown). */
  async userIdByOid(oid: string): Promise<string | null> {
    const { rows } = await this.db.query('SELECT id FROM app_user WHERE entra_oid=$1', [oid]);
    return rows[0]?.id ?? null;
  }
  async linkControl(riskId: string, controlId: string) {
    await this.db.query(
      `INSERT INTO risk_control (risk_id, control_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [riskId, controlId]);
  }
  private async nextRef(): Promise<string> {
    // Atomic — no race or reuse under concurrent inserts (see migration 0002).
    const { rows } = await this.db.query(`SELECT nextval('risk_ref_seq')::int n`);
    return 'RR-' + String(rows[0].n).padStart(3, '0');
  }
}
