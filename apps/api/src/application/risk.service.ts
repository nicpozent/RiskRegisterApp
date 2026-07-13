import type { Pool } from 'pg';
import { Risk, toView } from '../domain/risk.js';
import { Actor, canModifyRisk } from '../domain/roles.js';
import { RiskRepository } from '../infrastructure/risk.repository.js';
import { emit } from './events.js';
import { audit } from '../infrastructure/audit.js';
import { forbidden } from './errors.js';

export class RiskService {
  private repo: RiskRepository;
  constructor(private db: Pool) { this.repo = new RiskRepository(db); }

  async list() { return (await this.repo.findAll()).map(toView); }
  async get(id: string) { const r = await this.repo.findById(id); return r ? toView(r) : null; }

  /** Throw 403 unless the actor may modify this specific risk (object-level authz). */
  private async assertCanModify(actor: Actor, risk: Risk) {
    const actorUserId = await this.repo.userIdByOid(actor.oid);
    if (!canModifyRisk(actor.roles, actorUserId, risk)) {
      throw forbidden('not an owner or stakeholder of this risk');
    }
  }

  async create(input: Omit<Risk,'id'|'ref'>, actorOid: string) {
    const created = await this.repo.insert(input);
    await audit(this.db, actorOid, 'created', 'risk', created.id, null, created);
    await emit(this.db, { type: 'risk.assigned', riskId: created.id, actorOid });
    return toView(created);
  }

  async update(id: string, patch: Partial<Risk>, actor: Actor) {
    const before = await this.repo.findById(id);
    if (!before) return null;
    await this.assertCanModify(actor, before);
    const after  = await this.repo.update(id, patch);
    await audit(this.db, actor.oid, 'modified', 'risk', id, before, after);
    await emit(this.db, { type: 'risk.updated', riskId: id, actorOid: actor.oid, summary: Object.keys(patch).join(', ') });
    return after ? toView(after) : null;
  }

  /** Formal residual-risk acceptance (CISO/Admin) — distinct audit + event. */
  async accept(id: string, actor: Actor) {
    const before = await this.repo.findById(id);
    if (!before) return null;
    await this.assertCanModify(actor, before);
    const after = await this.repo.update(id, { status: 'accepted' });
    await audit(this.db, actor.oid, 'approved', 'risk', id, before, after);
    await emit(this.db, { type: 'risk.accepted', riskId: id, actorOid: actor.oid });
    return after ? toView(after) : null;
  }

  /** Map a control to a risk and notify owner + stakeholders. */
  async mapControl(riskId: string, controlId: string, actor: Actor) {
    const risk = await this.repo.findById(riskId);
    if (!risk) return null;
    await this.assertCanModify(actor, risk);
    await this.repo.linkControl(riskId, controlId);
    await audit(this.db, actor.oid, 'modified', 'risk_control', riskId, null, { controlId });
    await emit(this.db, { type: 'risk.updated', riskId, actorOid: actor.oid, summary: 'control mapped' });
    return true;
  }
}
