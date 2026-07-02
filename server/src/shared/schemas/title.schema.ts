import { z } from 'zod';

// New owner details shared by total alienation (transfer) and subdivision
export const NewOwnerSchema = z.object({
  full_name: z.string().min(2),
  ancestors: z.string().optional(),
  birth_place: z.string().optional(),
  birth_date: z.string().optional(), // ISO date string
});

export const TransferTitleSchema = z.object({
  new_owner: NewOwnerSchema,
  deed_reference: z.string().optional(),
  notes: z.string().optional(),
});

export const MortgageSchema = z.object({
  creditor: z.string().min(2),
  amount: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

// GeoJSON Polygon: array of linear rings, each an array of [lng, lat] positions
const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]).rest(z.number()))).min(1),
});

export const SubdivideTitleSchema = z.object({
  new_owner: NewOwnerSchema,
  area_sqm: z.number().positive(),
  geometry: PolygonSchema,
  plot_no: z.string().optional(),
  notes: z.string().optional(),
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
