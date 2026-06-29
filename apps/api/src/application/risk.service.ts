import type { Pool } from 'pg';
import { Risk, toView } from '../domain/risk.js';
import { RiskRepository } from '../infrastructure/risk.repository.js';
import { emit } from './events.js';
import { audit } from '../infrastructure/audit.js';

export class RiskService {
  private repo: RiskRepository;
  constructor(private db: Pool) { this.repo = new RiskRepository(db); }

  async list() { return (await this.repo.findAll()).map(toView); }
  async get(id: string) { const r = await this.repo.findById(id); return r ? toView(r) : null; }

  async create(input: Omit<Risk,'id'|'ref'>, actorOid: string) {
    const created = await this.repo.insert(input);
    await audit(this.db, actorOid, 'created', 'risk', created.id, null, created);
    await emit(this.db, { type: 'risk.assigned', riskId: created.id, actorOid });
    return toView(created);
  }

  async update(id: string, patch: Partial<Risk>, actorOid: string) {
    const before = await this.repo.findById(id);
    const after  = await this.repo.update(id, patch);
    await audit(this.db, actorOid, 'modified', 'risk', id, before, after);
    await emit(this.db, { type: 'risk.updated', riskId: id, actorOid, summary: Object.keys(patch).join(', ') });
    return after ? toView(after) : null;
  }

  /** Map a control to a risk and notify owner + stakeholders. */
  async mapControl(riskId: string, controlId: string, actorOid: string) {
    await this.repo.linkControl(riskId, controlId);
    await audit(this.db, actorOid, 'modified', 'risk_control', riskId, null, { controlId });
    await emit(this.db, { type: 'risk.updated', riskId, actorOid, summary: 'control mapped' });
  }
}
