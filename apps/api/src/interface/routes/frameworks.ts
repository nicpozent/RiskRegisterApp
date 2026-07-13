import { Router } from 'express';
import { FRAMEWORKS, REGION_ORDER } from '@rr/frameworks-data';
import { pool } from '../../infrastructure/db.js';
import { requireRole, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

export const frameworks = Router();

frameworks.get('/', requireRole(...AnyRole), asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT framework, count(*)::int total,
            count(*) FILTER (WHERE id IN (SELECT control_id FROM risk_control))::int mapped
       FROM control GROUP BY framework`);
  const stats = Object.fromEntries(rows.map(r => [r.framework, r]));
  res.json(FRAMEWORKS.map(f => ({ ...f,
    count: stats[f.id]?.total ?? 0, mapped: stats[f.id]?.mapped ?? 0 })));
}));
frameworks.get('/regions', requireRole(...AnyRole), (_req, res) => res.json(REGION_ORDER));
