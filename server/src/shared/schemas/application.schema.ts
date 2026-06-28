import { z } from 'zod';

export const AppTypeEnum = z.enum([
  'DIRECT_REGISTRATION',
  'PARTIAL_ALIENATION',
  'TOTAL_ALIENATION',
  'STATE_LAND',
  'PARTITION',
  'MORTGAGE',
  'TRANSFORMATION',
]);

// Used by POST /applications — type is required, parcel is optional for drafts
export const CreateApplicationSchema = z.object({
  type: AppTypeEnum,
  parcel_id: z.string().uuid().optional(),
});

// Used by POST /applications/:id/submit — applicant may finalise parcel before submitting
export const SubmitApplicationSchema = z.object({
  parcel_id: z.string().uuid().optional(),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationSchema>;
