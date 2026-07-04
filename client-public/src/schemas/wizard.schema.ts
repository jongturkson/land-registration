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
    desc: 'You are acquiring PART of an existing titled parcel. Requires the mother Title Number and the notarial act. Goes directly to the Land Registrar.',
  },
  {
    value: 'TOTAL_ALIENATION' as const,
    label: 'Total Alienation',
    desc: 'You are acquiring an ENTIRE titled parcel. Requires the Title Number and the notarial deed of sale. Goes directly to the Land Registrar.',
  },
  {
    value: 'STATE_LAND' as const,
    label: 'State Land',
    desc: 'Application for allocation of state-owned land.',
  },
  {
    value: 'PARTITION' as const,
    label: 'Partition',
    desc: 'Division of a jointly-held titled parcel among co-owners/heirs. Requires the mother Title Number and the partition judgment.',
  },
  {
    value: 'MORTGAGE' as const,
    label: 'Mortgage',
    desc: 'Inscription of a mortgage (hypothèque) on your titled parcel in favour of a creditor. Requires the Title Number and the notarial mortgage deed.',
  },
  {
    value: 'MORTGAGE_RELEASE' as const,
    label: 'Mortgage Release',
    desc: "Lifting (mainlevée) of a repaid mortgage from your title. Requires the Title Number and the creditor's release deed.",
  },
] as const;

export type AppTypeValue = (typeof APP_TYPES)[number]['value'];

// Types that operate on an EXISTING title — the wizard demands the title number
// and checks it live against the register
export const SOURCE_TITLE_TYPES = new Set([
  'PARTIAL_ALIENATION',
  'TOTAL_ALIENATION',
  'PARTITION',
  'MORTGAGE',
  'MORTGAGE_RELEASE',
]);

// Types where the land itself must be described (a parcel will be surveyed):
// first registrations, plus carve-outs where the CHILD portion is described
export const NEEDS_LAND_TYPES = new Set([
  'DIRECT_REGISTRATION',
  'STATE_LAND',
  'TRANSFORMATION',
  'PARTIAL_ALIENATION',
  'PARTITION',
]);

// Mortgage inscription / release — creditor details required
export const MORTGAGE_TYPES = new Set(['MORTGAGE', 'MORTGAGE_RELEASE']);

// ─── Full wizard Zod schema ────────────────────────────────────────────────
export const WizardSchema = z
  .object({
    type: z.enum([
      'DIRECT_REGISTRATION',
      'PARTIAL_ALIENATION',
      'TOTAL_ALIENATION',
      'STATE_LAND',
      'PARTITION',
      'MORTGAGE',
      'MORTGAGE_RELEASE',
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
      // Result of the live register check on title_no ('ok' | 'bad' | 'unknown')
      title_check: z.enum(['ok', 'bad', 'unknown']).optional(),
      plot_no: z.string().optional(),
      block_no: z.string().optional(),
      subdivision: z.string().optional(),
      division: z.string().optional(),
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

    // Hypothèque / mainlevée details
    mortgage: z
      .object({
        creditor: z.string().optional(),
        amount: z.string().optional(),
      })
      .optional(),

    documents: z.object({
      id_card: z.any().optional(),
      site_plan: z.any().optional(),
      attestation: z.any().optional(),
      // Type-specific statutory documents (enforced server-side at submission):
      // PARTITION requires the court judgment / inheritance certificate;
      // alienations & mortgages require the notarial act; a mortgage release
      // requires the creditor's release deed.
      judgment: z.any().optional(),
      notarial_act: z.any().optional(),
      release_deed: z.any().optional(),
      others: z.array(z.any()).optional(),
    }),

    consent: z
      .boolean()
      .refine((v) => v === true, { message: 'You must agree before submitting' }),
  })
  .superRefine((data, ctx) => {
    // Existing-title types must name a title, and it must have checked out VALID
    if (SOURCE_TITLE_TYPES.has(data.type)) {
      if (!data.land.title_no?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['land', 'title_no'],
          message: 'The existing Land Title Number is required for this application type',
        });
      } else if (data.land.title_check === 'bad') {
        ctx.addIssue({
          code: 'custom',
          path: ['land', 'title_no'],
          message: 'This title number was not found as VALID in the register — check it on the Titre Foncier',
        });
      }
    }

    // Land description required when a parcel will be created/surveyed
    if (NEEDS_LAND_TYPES.has(data.type)) {
      const required: [keyof typeof data.land, string][] = [
        ['plot_no', 'Plot number is required'],
        ['block_no', 'Block number is required'],
        ['subdivision', 'Subdivision is required'],
        ['division', 'Division is required'],
      ];
      for (const [field, message] of required) {
        const value = data.land[field];
        if (typeof value !== 'string' || !value.trim()) {
          ctx.addIssue({ code: 'custom', path: ['land', field], message });
        }
      }
    }

    // A mortgage inscription must name the creditor being secured
    if (data.type === 'MORTGAGE' && !data.mortgage?.creditor?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['mortgage', 'creditor'],
        message: 'The creditor (bank / lender) is required for a mortgage application',
      });
    }
  });

export type WizardFormData = z.infer<typeof WizardSchema>;

// Shared prop type passed to every step component
export type WizardStepProps = {
  form: UseFormReturn<WizardFormData>;
};
