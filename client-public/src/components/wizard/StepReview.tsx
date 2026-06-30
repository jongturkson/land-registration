import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import {
  Alert,
  Box,
  Checkbox,
  Divider,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';
import { APP_TYPES, type WizardStepProps } from '../../schemas/wizard.schema';

type Props = WizardStepProps & { submitError: string | null };

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 180 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
        {children}
      </Paper>
    </Box>
  );
}

export default function StepReview({ form, submitError }: Props) {
  const { control, getValues, formState: { errors } } = form;
  const data = getValues();

  const typeLabel = APP_TYPES.find((t) => t.value === data.type)?.label ?? data.type ?? '—';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Review Your Application
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Verify all information before submitting. Clicking Submit will generate your Récépissé.
        </Typography>
      </Box>

      <Section title="Application Type">
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {typeLabel}
        </Typography>
      </Section>

      <Section title="Owner Details">
        <ReviewRow label="Full Name" value={data.owner?.full_name} />
        <ReviewRow label="Address" value={data.owner?.address} />
        <ReviewRow label="ID Card No." value={data.owner?.id_card_no} />
        <ReviewRow label="ID Delivered On" value={data.owner?.id_delivered_on} />
        <ReviewRow label="Father's Name" value={data.owner?.father_name} />
        <ReviewRow label="Mother's Name" value={data.owner?.mother_name} />
        <ReviewRow label="Place of Birth" value={data.owner?.birth_place} />
        <ReviewRow label="Date of Birth" value={data.owner?.birth_date} />
        <ReviewRow label="Nationality" value={data.owner?.nationality} />
        <ReviewRow label="Profession" value={data.owner?.profession} />
        <ReviewRow label="Marital Status" value={data.owner?.marital_status} />
        <ReviewRow label="Matrimonial Regime" value={data.owner?.matrimonial_regime} />
        {data.owner?.acting_on_behalf && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Acting on behalf of:
            </Typography>
            <ReviewRow label="Name" value={data.owner?.behalf_name} />
            <ReviewRow label="ID No." value={data.owner?.behalf_id} />
            <ReviewRow label="Address" value={data.owner?.behalf_address} />
          </>
        )}
      </Section>

      <Section title="Land Details">
        <ReviewRow label="Land Title No." value={data.land?.title_no} />
        <ReviewRow label="Plot No." value={data.land?.plot_no} />
        <ReviewRow label="Block No." value={data.land?.block_no} />
        <ReviewRow label="Sub-Division" value={data.land?.subdivision} />
        <ReviewRow label="Division" value={data.land?.division} />
        <ReviewRow label="Locality (Lieu-dit)" value={data.land?.situation} />
        <ReviewRow label="Nature & Consistency" value={data.land?.nature} />
        <ReviewRow
          label="Area (Main Title)"
          value={data.land?.area_main ? `${data.land.area_main} m²` : undefined}
        />
        <ReviewRow
          label="Area (Partition)"
          value={data.land?.area_partition ? `${data.land.area_partition} m²` : undefined}
        />
        <ReviewRow
          label="Layout Plan"
          value={
            data.land?.has_layout_plan === 'yes'
              ? 'Yes'
              : data.land?.has_layout_plan === 'no'
                ? 'No'
                : undefined
          }
        />
        {data.land?.has_layout_plan === 'yes' && (
          <ReviewRow
            label="Plan Approved"
            value={data.land?.plan_approved === 'yes' ? 'Yes' : 'No'}
          />
        )}
        <ReviewRow label="Boundary — North" value={data.land?.limit_north} />
        <ReviewRow label="Boundary — South" value={data.land?.limit_south} />
        <ReviewRow label="Boundary — East" value={data.land?.limit_east} />
        <ReviewRow label="Boundary — West" value={data.land?.limit_west} />
        <ReviewRow label="Existing Developments" value={data.land?.developments} />
        <ReviewRow
          label="Value of Developments"
          value={data.land?.dev_value ? `${data.land.dev_value} FCFA` : undefined}
        />
        <ReviewRow
          label="Occupied by Others"
          value={
            data.land?.others_occupy === 'yes'
              ? 'Yes'
              : data.land?.others_occupy === 'no'
                ? 'No'
                : undefined
          }
        />
        {data.land?.lat !== undefined && data.land?.lng !== undefined && (
          <ReviewRow
            label="GPS Coordinates"
            value={`${data.land.lat.toFixed(5)}, ${data.land.lng.toFixed(5)}`}
          />
        )}
      </Section>

      <Section title="Documents">
        <ReviewRow
          label="ID Card"
          value={(data.documents?.id_card as File | undefined)?.name ?? 'Not attached'}
        />
        <ReviewRow
          label="Site Plan"
          value={(data.documents?.site_plan as File | undefined)?.name ?? 'Not attached'}
        />
        <ReviewRow
          label="Attestation"
          value={(data.documents?.attestation as File | undefined)?.name ?? 'Not attached'}
        />
        {((data.documents?.others as File[] | undefined)?.length ?? 0) > 0 &&
          (data.documents?.others as File[]).map((f, i) => (
            <ReviewRow key={`${f.name}-${i}`} label={i === 0 ? 'Other Documents' : ''} value={f.name} />
          ))}
      </Section>

      <Divider />

      <Controller
        name="consent"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={field.value ?? false}
                onChange={(e) => field.onChange(e.target.checked)}
                color="secondary"
              />
            }
            label={
              <Typography variant="body2">
                I declare that all information provided is accurate and complete. I consent to the
                processing of this application by the Divisional Registry, Buea, under the Land
                Tenure Ordinance of Cameroon.
              </Typography>
            }
            sx={{ alignItems: 'flex-start' }}
          />
        )}
      />
      {errors.consent && (
        <Typography color="error" variant="caption" sx={{ mt: -1 }}>
          {errors.consent.message}
        </Typography>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {submitError}
        </Alert>
      )}
    </Box>
  );
}
