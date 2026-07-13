import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../infrastructure/db.js';
import { requireRole, Roles, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

export const controls = Router();

const listQuery = z.object({
  framework: z.string().optional(), region: z.string().optional(), q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

controls.get('/', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { framework, region, q, limit, offset } = parsed.data;

  const params: unknown[] = []; const where: string[] = [];
  if (framework) { params.push(framework); where.push(`c.framework=$${params.length}`); }
  if (region)    { params.push(region);    where.push(`f.region=$${params.length}`); }
  if (q)         { params.push('%'+q.toLowerCase()+'%'); where.push(`lower(c.ref||' '||c.title) LIKE $${params.length}`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = await pool.query(
    `SELECT count(*)::int n FROM control c JOIN framework f ON f.id=c.framework ${whereSql}`, params);

  params.push(limit); const limitParam = params.length;
  params.push(offset); const offsetParam = params.length;
  const { rows } = await pool.query(
    `SELECT c.id, c.framework, c.ref, c.title, c.grp as "group", c.help, c.is_custom as "isCustom",
            (SELECT count(*) FROM risk_control rc WHERE rc.control_id=c.id)::int as "mappedCount"
       FROM control c JOIN framework f ON f.id=c.framework
       ${whereSql}
       ORDER BY c.framework, c.ref LIMIT $${limitParam} OFFSET $${offsetParam}`, params);

  res.setHeader('X-Total-Count', String(total.rows[0].n));
  res.json(rows);
}));

// Custom controls — Admin / CISO / Control Owner.
const customSchema = z.object({ framework: z.string(), ref: z.string(), title: z.string(),
  group: z.string().optional(), help: z.string().optional() });
controls.post('/', requireRole(Roles.Admin, Roles.Ciso, Roles.ControlOwner), asyncHandler(async (req, res) => {
  const p = customSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.flatten() });
  const { rows } = await pool.query(
    `INSERT INTO control (framework,ref,title,grp,help,is_custom,owner_id)
       VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING id`,
    [p.data.framework, p.data.ref, p.data.title, p.data.group, p.data.help, null]);
  res.status(201).json({ id: rows[0].id });
}));
