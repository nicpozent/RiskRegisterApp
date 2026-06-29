import { Router } from 'express';
import { pool } from '../../infrastructure/db.js';
import { RiskService } from '../../application/risk.service.js';
import { requireRole, Roles, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';
import { createSchema, updateSchema } from './risk.schemas.js';

const svc = new RiskService(pool);
export const risks = Router();

// Reads require *some* recognized role (deny tokens with an empty roles claim).
risks.get('/', requireRole(...AnyRole), asyncHandler(async (_req, res) => {
  res.json(await svc.list());
}));
risks.get('/:id', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const r = await svc.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
}));

const WRITE_ROLES = [Roles.Admin, Roles.Ciso, Roles.RiskOwner, Roles.Contributor] as const;

risks.post('/', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await svc.create(parsed.data, req.user!.oid));
}));

risks.patch('/:id', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await svc.update(req.params.id, parsed.data, req.user!);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
}));

// Only CISO / Admin may accept residual risk.
risks.post('/:id/accept', requireRole(Roles.Admin, Roles.Ciso), asyncHandler(async (req, res) => {
  const accepted = await svc.accept(req.params.id, req.user!);
  if (!accepted) return res.status(404).json({ error: 'not found' });
  res.json(accepted);
}));

risks.post('/:id/controls/:controlId', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const ok = await svc.mapControl(req.params.id, req.params.controlId, req.user!);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
}));
