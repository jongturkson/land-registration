import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

// ─── Application types shown in the wizard UI ──────────────────────────────
export const APP_TYPES = [
  {
    value: 'DIRECT_REGISTRATION' as const,
    label: 'Direct Registration',
    desc: 'First-time registration of land not yet titled.',
  },
  {
    value: 'PARTIAL_ALIENATION' as const,
    label: 'Partial Alienation',
    desc: 'Transfer of part of an existing titled parcel.',
  },
  {
    value: 'TOTAL_ALIENATION' as const,
    label: 'Total Alienation',
    desc: 'Transfer of an entire titled parcel to a new owner.',
  },
  {
    value: 'STATE_LAND' as const,
    label: 'State Land',
    desc: 'Application for allocation of state-owned land.',
  },
  {
    value: 'PARTITION' as const,
    label: 'Partition',
    desc: 'Division of a jointly-held parcel among co-owners.',
  },
  {
    value: 'MORTGAGE' as const,
    label: 'Mortgage',
    desc: 'Registration of a mortgage or charge on a titled parcel.',
  },
] as const;

export type AppTypeValue = (typeof APP_TYPES)[number]['value'];

// ─── Full wizard Zod schema ────────────────────────────────────────────────
export const WizardSchema = z.object({
  type: z.enum([
    'DIRECT_REGISTRATION',
    'PARTIAL_ALIENATION',
    'TOTAL_ALIENATION',
    'STATE_LAND',
    'PARTITION',
    'MORTGAGE',
    'TRANSFORMATION',
  ]),

  owner: z.object({
    full_name: z.string().min(1, 'Full name is required'),
    address: z.string().min(1, 'Address is required'),
    id_card_no: z.string().min(1, 'ID card number is required'),
    id_delivered_on: z.string().min(1, 'Delivery date is required'),
    // Civil status (État civil du propriétaire)
    father_name: z.string().optional(),
    mother_name: z.string().optional(),
    nationality: z.string().optional(),
    birth_place: z.string().optional(),
    birth_date: z.string().optional(),
    profession: z.string().optional(),
    marital_status: z.enum(['MARRIED', 'SINGLE', 'WIDOWED', 'DIVORCED']).optional(),
    matrimonial_regime: z.enum(['COMMUNITY', 'SEPARATION']).optional(),
    acting_on_behalf: z.boolean(),
    behalf_name: z.string().optional(),
    behalf_id: z.string().optional(),
    behalf_address: z.string().optional(),
  }),

  land: z.object({
    title_no: z.string().optional(),
    plot_no: z.string().min(1, 'Plot number is required'),
    block_no: z.string().min(1, 'Block number is required'),
    subdivision: z.string().min(1, 'Subdivision is required'),
    division: z.string().min(1, 'Division is required'),
    situation: z.string().optional(),
    nature: z.string().optional(),
    area_main: z.string().optional(),
    area_partition: z.string().optional(),
    // Boundaries (Limites)
    limit_north: z.string().optional(),
    limit_south: z.string().optional(),
    limit_east: z.string().optional(),
    limit_west: z.string().optional(),
    // Developments (ce que supporte le terrain)
    developments: z.string().optional(),
    dev_value: z.string().optional(),
    others_occupy: z.enum(['yes', 'no']).optional(),
    has_layout_plan: z.enum(['yes', 'no']).optional(),
    plan_approved: z.enum(['yes', 'no']).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),

  documents: z.object({
    id_card: z.any().optional(),
    site_plan: z.any().optional(),
    attestation: z.any().optional(),
    // Type-specific statutory documents (enforced server-side at submission):
    // PARTITION requires the court judgment / inheritance certificate;
    // alienations & mortgages require the notarial act.
    judgment: z.any().optional(),
    notarial_act: z.any().optional(),
    others: z.array(z.any()).optional(),
  }),

  consent: z
    .boolean()
    .refine((v) => v === true, { message: 'You must agree before submitting' }),
});

export type WizardFormData = z.infer<typeof WizardSchema>;

// Shared prop type passed to every step component
export type WizardStepProps = {
  form: UseFormReturn<WizardFormData>;
};
