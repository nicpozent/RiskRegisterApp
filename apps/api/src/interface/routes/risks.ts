import { Router } from 'express';
import { pool } from '../../infrastructure/db.js';
import { RiskService } from '../../application/risk.service.js';
import { requireRole, Roles, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';
import { createSchema, updateSchema, listQuerySchema, actionCreateSchema, actionUpdateSchema } from './risk.schemas.js';

const svc = new RiskService(pool);
export const risks = Router();

// Reads require *some* recognized role (deny tokens with an empty roles claim).
risks.get('/', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const q = listQuerySchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: q.error.flatten() });
  const { items, total } = await svc.list(q.data.limit, q.data.offset);
  // Total count in a header keeps the body a plain array (backward-compatible).
  res.setHeader('X-Total-Count', String(total));
  res.json(items);
}));
// Dashboard aggregates. Registered before '/:id' so it isn't captured as an id.
risks.get('/summary', requireRole(...AnyRole), asyncHandler(async (_req, res) => {
  res.json(await svc.summary());
}));

risks.get('/:id', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const r = await svc.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.setHeader('ETag', `"${r.version}"`);   // clients echo via If-Match on PATCH
  res.json(r);
}));

const WRITE_ROLES = [Roles.Admin, Roles.Ciso, Roles.RiskOwner, Roles.Contributor] as const;

risks.post('/', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await svc.create(parsed.data, req.user!));
}));

risks.patch('/:id', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  // Optional optimistic concurrency: If-Match carries the client's last-seen
  // version (from the ETag). Absent → last-write-wins (backward compatible).
  const ifMatch = req.get('If-Match');
  let expectedVersion: number | undefined;
  if (ifMatch !== undefined) {
    expectedVersion = Number(ifMatch.replace(/^W\//, '').replace(/"/g, ''));
    if (!Number.isInteger(expectedVersion)) {
      return res.status(400).json({ error: 'invalid If-Match: expected an integer version' });
    }
  }
  const updated = await svc.update(req.params.id, parsed.data, req.user!, expectedVersion);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.setHeader('ETag', `"${updated.version}"`);
  res.json(updated);
}));

// Only CISO / Admin may accept residual risk.
risks.post('/:id/accept', requireRole(Roles.Admin, Roles.Ciso), asyncHandler(async (req, res) => {
  const accepted = await svc.accept(req.params.id, req.user!);
  if (!accepted) return res.status(404).json({ error: 'not found' });
  res.json(accepted);
}));

// ---- Treatment actions ----
risks.get('/:id/actions', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const list = await svc.listActions(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  res.json(list);
}));

risks.post('/:id/actions', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = actionCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const created = await svc.addAction(req.params.id, parsed.data, req.user!);
  if (!created) return res.status(404).json({ error: 'not found' });
  res.status(201).json(created);
}));

risks.patch('/:id/actions/:actionId', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const parsed = actionUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const updated = await svc.updateAction(req.params.id, req.params.actionId, parsed.data, req.user!);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
}));

risks.get('/:id/controls', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const list = await svc.controls(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  res.json(list);
}));

risks.post('/:id/controls/:controlId', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const ok = await svc.mapControl(req.params.id, req.params.controlId, req.user!);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
}));
