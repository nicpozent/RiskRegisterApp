import { z } from 'zod';

// status excludes 'accepted': a formal residual-risk acceptance must go through
// POST /risks/:id/accept (CISO/Admin only), never a generic create/patch.
const patchableStatus = z.enum(['open', 'assessed', 'treating', 'monitored', 'closed']);

export const createSchema = z.object({
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

// Partial of create for PATCH, with status narrowed to non-acceptance values.
export const updateSchema = createSchema.partial().extend({ status: patchableStatus.optional() });

// Treatment actions (risk-scoped tasks).
export const actionCreateSchema = z.object({
  description: z.string().min(3),
  ownerId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'done', 'cancelled']).optional(),
});
export const actionUpdateSchema = actionCreateSchema.partial();

// Maker-checker: the proposed change reuses updateSchema; a rejection may carry a note.
export const rejectSchema = z.object({ note: z.string().max(1000).optional() });

// Evidence upload. The binary arrives base64-encoded in JSON (no multipart dep);
// content type is allow-listed and the decoded size is capped in the route.
export const EVIDENCE_CONTENT_TYPES = [
  'application/pdf', 'image/png', 'image/jpeg', 'text/csv', 'text/plain',
  'application/msword', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10 MB
export const evidenceSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(EVIDENCE_CONTENT_TYPES),
  dataBase64: z.string().min(1),
});

// Pagination for GET /risks. Sane defaults + a hard cap so a client can't ask
// for an unbounded page.
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
