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

export const AppStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'RECEIPTED',
  'PUBLISHED',
  'BOARD_SCHEDULED',
  'SURVEYED',
  'REGIONAL_REVIEW',
  'OPPOSITION_WINDOW',
  'CLEARED',
  'TITLE_ISSUED',
  'QUERIED',
  'REJECTED',
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

// Used by POST /applications/:id/transition — officer workflow step
export const TransitionApplicationSchema = z.object({
  new_status: AppStatusEnum,
  decision: z.string().min(1, 'Decision note is required'),
});

// Used by POST /applications/:id/survey — surveyor spatial data entry
export const SurveySchema = z.object({
  // GeoJSON Polygon rings: outer ring + optional holes, each position [lng, lat]
  coordinates: z
    .array(z.array(z.array(z.number())))
    .min(1, 'Polygon coordinates are required'),
  scale: z.string().min(1, 'Scale is required'),
  paper_format: z.string().min(1, 'Paper format is required'),
  persons_present: z
    .array(z.string().min(1))
    .min(1, 'At least one person must be listed'),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationSchema>;
export type TransitionApplicationInput = z.infer<typeof TransitionApplicationSchema>;
export type SurveyInput = z.infer<typeof SurveySchema>;
