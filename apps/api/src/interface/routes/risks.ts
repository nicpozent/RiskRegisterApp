import { Router, json } from 'express';
import { pool } from '../../infrastructure/db.js';
import { RiskService } from '../../application/risk.service.js';
import { requireRole, Roles, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';
import {
  createSchema, updateSchema, listQuerySchema, actionCreateSchema, actionUpdateSchema,
  evidenceSchema, MAX_EVIDENCE_BYTES,
} from './risk.schemas.js';

// Larger body limit only for evidence uploads (base64-encoded binary); the
// app-wide JSON limit stays at 256 kb and skips this path (see http.ts).
const evidenceBody = json({ limit: '15mb' });
const safeName = (n: string) => n.replace(/[\r\n"]/g, '').slice(0, 255);

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

// ---- Evidence attachments ----
risks.get('/:id/evidence', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const list = await svc.listEvidence(req.params.id);
  if (!list) return res.status(404).json({ error: 'not found' });
  res.json(list);
}));

risks.post('/:id/evidence', requireRole(...WRITE_ROLES), evidenceBody, asyncHandler(async (req, res) => {
  const parsed = evidenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = Buffer.from(parsed.data.dataBase64, 'base64');
  if (data.length === 0) return res.status(400).json({ error: 'empty file' });
  if (data.length > MAX_EVIDENCE_BYTES) return res.status(413).json({ error: 'file exceeds 10 MB' });
  const created = await svc.addEvidence(req.params.id, {
    filename: safeName(parsed.data.filename), contentType: parsed.data.contentType,
    sizeBytes: data.length, data,
  }, req.user!);
  if (!created) return res.status(404).json({ error: 'not found' });
  res.status(201).json(created);
}));

risks.get('/:id/evidence/:evidenceId', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const blob = await svc.getEvidence(req.params.id, req.params.evidenceId);
  if (!blob) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Type', blob.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${safeName(blob.filename)}"`);
  res.send(blob.data);
}));

risks.delete('/:id/evidence/:evidenceId', requireRole(...WRITE_ROLES), asyncHandler(async (req, res) => {
  const result = await svc.deleteEvidence(req.params.id, req.params.evidenceId, req.user!);
  if (result === null || result === false) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
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
