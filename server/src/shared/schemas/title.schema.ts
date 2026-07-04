import { z } from 'zod';

// POST /applications/:id/execute — registrar executes a CLEARED registrar-direct
// application (mutation totale / hypothèque / mainlevée) on the source title.
export const ExecuteApplicationSchema = z.object({
  notes: z.string().optional(),
});

// POST /titles/:title_no/cancel — ministerial cancellation of a title.
// The ministerial order reference is mandatory; the registrar must also
// explicitly confirm the irreversible act.
export const CancelTitleSchema = z.object({
  ministerial_order_ref: z.string().trim().min(3, 'Ministerial order reference is required'),
  reason: z.string().optional(),
  confirm: z.literal(true, { message: 'Cancellation must be explicitly confirmed' }),
});

export const FileDisputeSchema = z.object({
  opponent_name: z.string().min(2),
  opponent_contact: z.string().optional(),
  grounds: z.string().min(10),
});

export const ResolveDisputeSchema = z.object({
  resolution_notes: z.string().min(5),
  outcome: z.enum(['RESOLVED', 'WITHDRAWN']).default('RESOLVED'),
});
