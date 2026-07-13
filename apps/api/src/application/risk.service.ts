import type { Pool } from 'pg';
import { Risk, toView } from '../domain/risk.js';
import { band, Band } from '../domain/scoring.js';
import { Actor, canModifyRisk } from '../domain/roles.js';
import { RiskRepository } from '../infrastructure/risk.repository.js';
import type { Queryable } from '../infrastructure/db.js';
import { emit } from './events.js';
import { audit } from '../infrastructure/audit.js';
import { forbidden, conflict } from './errors.js';

export interface RiskSummary {
  total: number;
  inherentAle: number;
  residualAle: number;
  byInherentBand: Record<Band, number>;
  byResidualBand: Record<Band, number>;
  byStatus: Record<string, number>;
  byTreatment: Record<string, number>;
}

export class RiskService {
  private reads: RiskRepository;
  constructor(private pool: Pool) { this.reads = new RiskRepository(pool); }

  async list(limit = 50, offset = 0) {
    const [rows, total] = await Promise.all([this.reads.findAll(limit, offset), this.reads.count()]);
    return { items: rows.map(toView), total };
  }
  async get(id: string) { const r = await this.reads.findById(id); return r ? toView(r) : null; }

  /** All risk views for reporting/export (bounded to a sane cap). */
  async exportRegister(cap = 5000) {
    const rows = await this.reads.findAll(cap, 0);
    return rows.map(toView);
  }

  /** Consolidated evidence pack: the risk plus its mapped controls and actions. */
  async report(id: string) {
    const risk = await this.get(id);
    if (!risk) return null;
    const [controls, actions] = await Promise.all([this.reads.controlsFor(id), this.reads.actionsFor(id)]);
    return { risk, controls, actions };
  }

  /** Register-wide dashboard aggregates (counts by band/status/treatment, ALE totals). */
  async summary(): Promise<RiskSummary> {
    const raw = await this.reads.summary();
    const bands = (rows: { s: number; n: number }[]): Record<Band, number> => {
      const acc: Record<Band, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
      for (const { s, n } of rows) acc[band(s)] += n;
      return acc;
    };
    const tally = <K extends string>(rows: Record<K, string | number>[], key: K): Record<string, number> => {
      const acc: Record<string, number> = {};
      for (const r of rows) acc[String(r[key])] = Number((r as { n: number }).n);
      return acc;
    };
    return {
      total: raw.total,
      inherentAle: raw.inherentAle,
      residualAle: raw.residualAle,
      byInherentBand: bands(raw.inherentScores),
      byResidualBand: bands(raw.residualScores),
      byStatus: tally(raw.byStatus, 'status'),
      byTreatment: tally(raw.byTreatment, 'treatment'),
    };
  }

  /** Controls mapped to a risk (null if the risk doesn't exist). */
  async controls(id: string) {
    const risk = await this.reads.findById(id);
    if (!risk) return null;
    return this.reads.controlsFor(id);
  }

  /**
   * Run a mutation, its audit row, and its emitted event in ONE transaction, so
   * a crash can never leave a business change without its audit entry (or vice
   * versa). The repo/audit/emit inside `fn` share the same transaction client.
   */
  private async withTx<T>(fn: (repo: RiskRepository, tx: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(new RiskRepository(client), client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** Throw 403 unless the actor may modify this specific risk (object-level authz). */
  private async assertCanModify(repo: RiskRepository, actor: Actor, risk: Risk) {
    const actorUserId = await repo.userIdByOid(actor.oid);
    if (!canModifyRisk(actor.roles, actorUserId, risk)) {
      throw forbidden('not an owner or stakeholder of this risk');
    }
  }

  async create(input: Omit<Risk,'id'|'ref'|'version'>, actor: Actor) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);            // JIT-provision the creator
      const created = await repo.insert(input);
      await audit(tx, actor.oid, 'created', 'risk', created.id, null, created);
      await emit(tx, { type: 'risk.assigned', riskId: created.id, actorOid: actor.oid });
      return toView(created);
    });
  }

  async update(id: string, patch: Partial<Risk>, actor: Actor, expectedVersion?: number) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);            // JIT-provision the actor before authz
      const before = await repo.findById(id);
      if (!before) return null;
      await this.assertCanModify(repo, actor, before);

      let after: Risk | null;
      if (expectedVersion !== undefined) {
        const res = await repo.updateIfVersion(id, patch, expectedVersion);
        if (res === 'conflict') throw conflict(`risk was modified by someone else (expected version ${expectedVersion})`);
        if (res === 'notfound') return null;
        after = res;
      } else {
        after = await repo.update(id, patch);
      }

      await audit(tx, actor.oid, 'modified', 'risk', id, before, after);
      await emit(tx, { type: 'risk.updated', riskId: id, actorOid: actor.oid, summary: Object.keys(patch).join(', ') });
      return after ? toView(after) : null;
    });
  }

  /** Formal residual-risk acceptance (CISO/Admin) — distinct audit + event. */
  async accept(id: string, actor: Actor) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);
      const before = await repo.findById(id);
      if (!before) return null;
      await this.assertCanModify(repo, actor, before);
      const after = await repo.update(id, { status: 'accepted' });
      await audit(tx, actor.oid, 'approved', 'risk', id, before, after);
      await emit(tx, { type: 'risk.accepted', riskId: id, actorOid: actor.oid });
      return after ? toView(after) : null;
    });
  }

  // ---- Treatment actions ----

  /** Actions for a risk (null if the risk doesn't exist). */
  async listActions(riskId: string) {
    const risk = await this.reads.findById(riskId);
    if (!risk) return null;
    return this.reads.actionsFor(riskId);
  }

  async addAction(riskId: string, input: { description: string; ownerId?: string; dueDate?: string; status?: string }, actor: Actor) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);
      const risk = await repo.findById(riskId);
      if (!risk) return null;
      await this.assertCanModify(repo, actor, risk);
      const action = await repo.insertAction(riskId, input);
      await audit(tx, actor.oid, 'created', 'treatment_action', action.id, null, action);
      await emit(tx, { type: 'risk.updated', riskId, actorOid: actor.oid, summary: 'treatment action added' });
      return action;
    });
  }

  async updateAction(riskId: string, actionId: string, patch: { description?: string; ownerId?: string; dueDate?: string; status?: string }, actor: Actor) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);
      const risk = await repo.findById(riskId);
      if (!risk) return null;
      await this.assertCanModify(repo, actor, risk);
      const before = await repo.actionsFor(riskId);
      const after = await repo.updateAction(riskId, actionId, patch);
      if (!after) return null;
      await audit(tx, actor.oid, 'modified', 'treatment_action', actionId,
        before.find((a) => a.id === actionId) ?? null, after);
      await emit(tx, { type: 'risk.updated', riskId, actorOid: actor.oid, summary: `treatment action ${Object.keys(patch).join(', ')}` });
      return after;
    });
  }

  /** Map a control to a risk and notify owner + stakeholders. */
  async mapControl(riskId: string, controlId: string, actor: Actor) {
    return this.withTx(async (repo, tx) => {
      await repo.ensureUser(actor);
      const risk = await repo.findById(riskId);
      if (!risk) return null;
      await this.assertCanModify(repo, actor, risk);
      await repo.linkControl(riskId, controlId);
      await audit(tx, actor.oid, 'modified', 'risk_control', riskId, null, { controlId });
      await emit(tx, { type: 'risk.updated', riskId, actorOid: actor.oid, summary: 'control mapped' });
      return true;
    });
  }
}
