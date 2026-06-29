import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../infrastructure/db.js';
import { RiskService } from '../../application/risk.service.js';
import { requireRole, Roles } from '../middleware/rbac.js';

const svc = new RiskService(pool);
export const risks = Router();

risks.get('/', async (_req, res) => res.json(await svc.list()));
risks.get('/:id', async (req, res) => {
  const r = await svc.get(req.params.id);
  r ? res.json(r) : res.status(404).json({ error: 'not found' });
});

const createSchema = z.object({
  title: z.string().min(3), description: z.string().optional(), category: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  inherentL: z.number().int().min(1).max(5), inherentI: z.number().int().min(1).max(5),
  residualL: z.number().int().min(1).max(5), residualI: z.number().int().min(1).max(5),
  treatment: z.enum(['Mitigate','Transfer','Avoid','Accept']),
  status: z.enum(['open','assessed','treating','monitored','accepted','closed']).default('open'),
  sle: z.number().optional(), aro: z.number().optional(), residualAro: z.number().optional(),
  nextReview: z.string().optional(), controlIds: z.array(z.string().uuid()).default([]),
  stakeholderIds: z.array(z.string().uuid()).default([]),
});

risks.post('/', requireRole(Roles.Admin, Roles.Ciso, Roles.RiskOwner, Roles.Contributor), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  res.status(201).json(await svc.create(parsed.data as any, req.user!.oid));
});

risks.patch('/:id', requireRole(Roles.Admin, Roles.Ciso, Roles.RiskOwner, Roles.Contributor), async (req, res) => {
  res.json(await svc.update(req.params.id, req.body, req.user!.oid));
});

// Only CISO / Admin may accept residual risk.
risks.post('/:id/accept', requireRole(Roles.Admin, Roles.Ciso), async (req, res) => {
  res.json(await svc.update(req.params.id, { status: 'accepted' }, req.user!.oid));
});

risks.post('/:id/controls/:controlId', requireRole(Roles.Admin, Roles.Ciso, Roles.RiskOwner, Roles.Contributor), async (req, res) => {
  await svc.mapControl(req.params.id, req.params.controlId, req.user!.oid);
  res.status(204).end();
});
