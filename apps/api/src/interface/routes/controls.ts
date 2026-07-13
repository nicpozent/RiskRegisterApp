import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../infrastructure/db.js';
import { requireRole, Roles, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

export const controls = Router();

controls.get('/', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const { framework, region, q } = req.query as Record<string,string>;
  const params: unknown[] = []; const where: string[] = [];
  if (framework) { params.push(framework); where.push(`c.framework=$${params.length}`); }
  if (region)    { params.push(region);    where.push(`f.region=$${params.length}`); }
  if (q)         { params.push('%'+q.toLowerCase()+'%'); where.push(`lower(c.ref||' '||c.title) LIKE $${params.length}`); }
  const { rows } = await pool.query(
    `SELECT c.id, c.framework, c.ref, c.title, c.grp as "group", c.help, c.is_custom as "isCustom",
            (SELECT count(*) FROM risk_control rc WHERE rc.control_id=c.id)::int as "mappedCount"
       FROM control c JOIN framework f ON f.id=c.framework
       ${where.length ? 'WHERE '+where.join(' AND ') : ''}
       ORDER BY c.framework, c.ref LIMIT 1000`, params);
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
