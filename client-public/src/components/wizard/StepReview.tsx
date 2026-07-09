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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { control, getValues, formState: { errors } } = form;
  const data = getValues();

  const fallbackTypeLabel = APP_TYPES.find((a) => a.value === data.type)?.label ?? data.type ?? '—';
  const typeLabel = data.type
    ? t(`wizard.types.${data.type}.label`, { defaultValue: fallbackTypeLabel })
    : '—';
  const yes = t('wizard.review.yes');
  const no = t('wizard.review.no');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {t('wizard.review.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('wizard.review.subtitle')}
        </Typography>
      </Box>

      <Section title={t('wizard.review.sectionType')}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {typeLabel}
        </Typography>
      </Section>

      <Section title={t('wizard.review.sectionOwner')}>
        <ReviewRow label={t('wizard.review.fullName')} value={data.owner?.full_name} />
        <ReviewRow label={t('wizard.review.address')} value={data.owner?.address} />
        <ReviewRow label={t('wizard.review.idCardNo')} value={data.owner?.id_card_no} />
        <ReviewRow label={t('wizard.review.idDeliveredOn')} value={data.owner?.id_delivered_on} />
        <ReviewRow label={t('wizard.review.father')} value={data.owner?.father_name} />
        <ReviewRow label={t('wizard.review.mother')} value={data.owner?.mother_name} />
        <ReviewRow label={t('wizard.review.birthPlace')} value={data.owner?.birth_place} />
        <ReviewRow label={t('wizard.review.birthDate')} value={data.owner?.birth_date} />
        <ReviewRow label={t('wizard.review.nationality')} value={data.owner?.nationality} />
        <ReviewRow label={t('wizard.review.profession')} value={data.owner?.profession} />
        <ReviewRow label={t('wizard.review.maritalStatus')} value={data.owner?.marital_status} />
        <ReviewRow label={t('wizard.review.matrimonialRegime')} value={data.owner?.matrimonial_regime} />
        {data.owner?.acting_on_behalf && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              {t('wizard.review.actingFor')}
            </Typography>
            <ReviewRow label={t('wizard.review.name')} value={data.owner?.behalf_name} />
            <ReviewRow label={t('wizard.review.idNo')} value={data.owner?.behalf_id} />
            <ReviewRow label={t('wizard.review.address')} value={data.owner?.behalf_address} />
          </>
        )}
      </Section>

      <Section title={t('wizard.review.sectionLand')}>
        <ReviewRow label={t('wizard.review.titleNo')} value={data.land?.title_no} />
        <ReviewRow label={t('wizard.review.plotNo')} value={data.land?.plot_no} />
        <ReviewRow label={t('wizard.review.blockNo')} value={data.land?.block_no} />
        <ReviewRow label={t('wizard.review.subdivision')} value={data.land?.subdivision} />
        <ReviewRow label={t('wizard.review.division')} value={data.land?.division} />
        <ReviewRow label={t('wizard.review.locality')} value={data.land?.situation} />
        <ReviewRow label={t('wizard.review.nature')} value={data.land?.nature} />
        <ReviewRow
          label={t('wizard.review.areaMain')}
          value={data.land?.area_main ? `${data.land.area_main} m²` : undefined}
        />
        <ReviewRow
          label={t('wizard.review.areaPartition')}
          value={data.land?.area_partition ? `${data.land.area_partition} m²` : undefined}
        />
        <ReviewRow
          label={t('wizard.review.layoutPlan')}
          value={
            data.land?.has_layout_plan === 'yes'
              ? yes
              : data.land?.has_layout_plan === 'no'
                ? no
                : undefined
          }
        />
        {data.land?.has_layout_plan === 'yes' && (
          <ReviewRow
            label={t('wizard.review.planApproved')}
            value={data.land?.plan_approved === 'yes' ? yes : no}
          />
        )}
        <ReviewRow label={t('wizard.review.north')} value={data.land?.limit_north} />
        <ReviewRow label={t('wizard.review.south')} value={data.land?.limit_south} />
        <ReviewRow label={t('wizard.review.east')} value={data.land?.limit_east} />
        <ReviewRow label={t('wizard.review.west')} value={data.land?.limit_west} />
        <ReviewRow label={t('wizard.review.developments')} value={data.land?.developments} />
        <ReviewRow
          label={t('wizard.review.devValue')}
          value={data.land?.dev_value ? `${data.land.dev_value} FCFA` : undefined}
        />
        <ReviewRow
          label={t('wizard.review.occupied')}
          value={
            data.land?.others_occupy === 'yes'
              ? yes
              : data.land?.others_occupy === 'no'
                ? no
                : undefined
          }
        />
        {data.land?.lat !== undefined && data.land?.lng !== undefined && (
          <ReviewRow
            label={t('wizard.review.gps')}
            value={`${data.land.lat.toFixed(5)}, ${data.land.lng.toFixed(5)}`}
          />
        )}
      </Section>

      <Section title={t('wizard.review.sectionDocs')}>
        <ReviewRow
          label={t('wizard.review.idCard')}
          value={(data.documents?.id_card as File | undefined)?.name ?? t('wizard.review.notAttached')}
        />
        <ReviewRow
          label={t('wizard.review.sitePlan')}
          value={(data.documents?.site_plan as File | undefined)?.name ?? t('wizard.review.notAttached')}
        />
        <ReviewRow
          label={t('wizard.review.attestation')}
          value={(data.documents?.attestation as File | undefined)?.name ?? t('wizard.review.notAttached')}
        />
        {((data.documents?.others as File[] | undefined)?.length ?? 0) > 0 &&
          (data.documents?.others as File[]).map((f, i) => (
            <ReviewRow
              key={`${f.name}-${i}`}
              label={i === 0 ? t('wizard.review.otherDocs') : ''}
              value={f.name}
            />
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
            label={<Typography variant="body2">{t('wizard.review.consent')}</Typography>}
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
