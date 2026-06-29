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
