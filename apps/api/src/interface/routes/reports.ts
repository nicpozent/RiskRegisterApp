import { Router } from 'express';
import { pool } from '../../infrastructure/db.js';
import { RiskService } from '../../application/risk.service.js';
import { requireRole, AnyRole } from '../middleware/rbac.js';
import { asyncHandler } from '../async-handler.js';

const svc = new RiskService(pool);
export const reports = Router();

/** RFC-4180 CSV field escaping: quote when needed, double embedded quotes. */
function csvField(v: unknown): string {
  if (v == null) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: (unknown[])[]): string {
  const lines = [headers.join(','), ...rows.map((r) => r.map(csvField).join(','))];
  return lines.join('\r\n') + '\r\n';
}

const REPORT_COLUMNS = [
  'ref', 'title', 'category', 'status', 'treatment',
  'inherentScore', 'inherentBand', 'residualScore', 'residualBand',
  'inherentAle', 'residualAle', 'reduction', 'nextReview',
] as const;

// Register export as CSV — any recognized (authenticated) role may export.
reports.get('/register.csv', requireRole(...AnyRole), asyncHandler(async (_req, res) => {
  const risks = await svc.exportRegister();
  const rows = risks.map((r) => REPORT_COLUMNS.map((c) => r[c as keyof typeof r]));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="risk-register.csv"');
  res.send(toCsv([...REPORT_COLUMNS], rows));
}));

// Per-risk evidence pack (risk + mapped controls + treatment actions) as JSON.
reports.get('/risk/:id', requireRole(...AnyRole), asyncHandler(async (req, res) => {
  const pack = await svc.report(req.params.id);
  if (!pack) return res.status(404).json({ error: 'not found' });
  res.setHeader('Content-Disposition', `attachment; filename="evidence-${pack.risk.ref}.json"`);
  res.json({ generatedAt: new Date().toISOString(), ...pack });
}));
