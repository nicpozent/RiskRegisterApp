import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../infrastructure/db.js';
import { PersonnelRepository } from '../../infrastructure/personnel.repository.js';
import { requireRole, Roles } from '../middleware/rbac.js';
import { ELEVATED, isElevated } from '../../domain/roles.js';
import { asyncHandler } from '../async-handler.js';

// Personnel module: team SWOT + individual development plans. The content is
// sensitive PII (encrypted at rest in the repository). Access is Admin/CISO
// (governance) plus the manager of a team — a manager may read/write the SWOT of
// teams they manage and the development plans of those teams' members.
//
// The router is only mounted when PERSONNEL_MODULE_ENABLED is set (see http.ts),
// so when the feature is gated off these paths simply 404.
export const personnel = Router();
const repo = new PersonnelRepository(pool);

// Managing teams and membership is an administrative (governance) function.
const ADMIN_ROLES = [Roles.Admin, Roles.Ciso] as const;
// Any authenticated principal may call the read/write endpoints; fine-grained
// access (elevated-or-manager) is enforced per resource below.
const AUTHED = [...ELEVATED, Roles.RiskOwner, Roles.ControlOwner, Roles.Auditor, Roles.Contributor, Roles.Viewer];

async function actorUserId(oid: string): Promise<string | null> {
  const { rows } = await pool.query('SELECT id FROM app_user WHERE entra_oid = $1', [oid]);
  return rows[0]?.id ?? null;
}

const swotSchema = z.object({
  strengths: z.string().max(20_000).default(''),
  weaknesses: z.string().max(20_000).default(''),
  opportunities: z.string().max(20_000).default(''),
  threats: z.string().max(20_000).default(''),
});
const createTeamSchema = z.object({ name: z.string().trim().min(1).max(200), managerId: z.string().uuid().nullish() });
const memberSchema = z.object({ userId: z.string().uuid() });
const devPlanSchema = z.object({ content: z.string().max(50_000).default('') });

// List teams the caller may see: Admin/CISO see all; a manager sees theirs;
// anyone else sees an empty list.
personnel.get('/teams', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  if (isElevated(req.user!.roles)) return res.json(await repo.listTeams());
  const uid = await actorUserId(req.user!.oid);
  res.json(uid ? await repo.teamsManagedBy(uid) : []);
}));

// Create a team (governance action).
personnel.post('/teams', requireRole(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await repo.createTeam(parsed.data.name, parsed.data.managerId ?? null);
  res.status(201).json(team);
}));

/** Elevated, or the manager of this specific team. 404 if the team is unknown. */
async function canAccessTeam(req: import('express').Request, teamId: string): Promise<boolean | 'notfound'> {
  if (!(await repo.teamExists(teamId))) return 'notfound';
  if (isElevated(req.user!.roles)) return true;
  const uid = await actorUserId(req.user!.oid);
  return !!uid && (await repo.managerOf(teamId)) === uid;
}

personnel.get('/teams/:id/swot', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  const access = await canAccessTeam(req, req.params.id);
  if (access === 'notfound') return res.status(404).json({ error: 'not found' });
  if (!access) return res.status(403).json({ error: 'forbidden' });
  res.json(await repo.getSwot(req.params.id));
}));

personnel.put('/teams/:id/swot', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  const access = await canAccessTeam(req, req.params.id);
  if (access === 'notfound') return res.status(404).json({ error: 'not found' });
  if (!access) return res.status(403).json({ error: 'forbidden' });
  const parsed = swotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await repo.upsertSwot(req.params.id, parsed.data, await actorUserId(req.user!.oid));
  res.json(await repo.getSwot(req.params.id));
}));

personnel.get('/teams/:id/members', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  const access = await canAccessTeam(req, req.params.id);
  if (access === 'notfound') return res.status(404).json({ error: 'not found' });
  if (!access) return res.status(403).json({ error: 'forbidden' });
  res.json(await repo.listMembers(req.params.id));
}));

// Membership changes are a governance action (Admin/CISO).
personnel.post('/teams/:id/members', requireRole(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  if (!(await repo.teamExists(req.params.id))) return res.status(404).json({ error: 'not found' });
  const parsed = memberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await repo.addMember(req.params.id, parsed.data.userId);
  res.status(204).end();
}));

personnel.delete('/teams/:id/members/:userId', requireRole(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  await repo.removeMember(req.params.id, req.params.userId);
  res.status(204).end();
}));

/** Elevated, or a manager of some team the target user belongs to. */
async function canAccessDevPlan(req: import('express').Request, targetUserId: string): Promise<boolean> {
  if (isElevated(req.user!.roles)) return true;
  const uid = await actorUserId(req.user!.oid);
  return !!uid && repo.managerHasReport(uid, targetUserId);
}

personnel.get('/users/:userId/devplan', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  if (!(await canAccessDevPlan(req, req.params.userId))) return res.status(403).json({ error: 'forbidden' });
  res.json(await repo.getDevelopmentPlan(req.params.userId));
}));

personnel.put('/users/:userId/devplan', requireRole(...AUTHED), asyncHandler(async (req, res) => {
  if (!(await canAccessDevPlan(req, req.params.userId))) return res.status(403).json({ error: 'forbidden' });
  const parsed = devPlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await repo.upsertDevelopmentPlan(req.params.userId, parsed.data.content, await actorUserId(req.user!.oid));
  res.json(await repo.getDevelopmentPlan(req.params.userId));
}));
