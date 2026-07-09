import { useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import {
  MORTGAGE_TYPES,
  NEEDS_LAND_TYPES,
  SOURCE_TITLE_TYPES,
  type WizardStepProps,
} from '../../schemas/wizard.schema';
import MapPinSelector from './MapPinSelector';
import api from '../../lib/api';

type TitleCheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'ok'; division: string }
  | { kind: 'invalid'; status: string }
  | { kind: 'not-found' }
  | { kind: 'error' };

export default function StepLand({ form }: WizardStepProps) {
  const { t } = useTranslation();
  const { control, setValue, formState: { errors } } = form;
  const appType = useWatch({ control, name: 'type' }) as string | undefined;
  const hasLayoutPlan = useWatch({ control, name: 'land.has_layout_plan' });
  const lat = useWatch({ control, name: 'land.lat' });
  const lng = useWatch({ control, name: 'land.lng' });

  const needsSourceTitle = !!appType && SOURCE_TITLE_TYPES.has(appType);
  const needsLand = !appType || NEEDS_LAND_TYPES.has(appType);
  const isMortgageType = !!appType && MORTGAGE_TYPES.has(appType);
  const isCarveOut = appType === 'PARTIAL_ALIENATION' || appType === 'PARTITION';

  // Live register check of the entered title number
  const [titleCheck, setTitleCheck] = useState<TitleCheckState>({ kind: 'idle' });
  const checkSeq = useRef(0);

  async function verifyTitleNo(raw: string) {
    const title_no = raw.trim();
    if (!title_no) {
      setTitleCheck({ kind: 'idle' });
      setValue('land.title_check', undefined);
      return;
    }
    const seq = ++checkSeq.current;
    setTitleCheck({ kind: 'checking' });
    try {
      const res = await api.get<{ found: boolean; status?: string; division?: string }>(
        `/titles/${encodeURIComponent(title_no)}/validate`,
      );
      if (seq !== checkSeq.current) return; // stale response
      if (!res.data.found) {
        setTitleCheck({ kind: 'not-found' });
        setValue('land.title_check', 'bad', { shouldValidate: true });
      } else if (res.data.status !== 'VALID') {
        setTitleCheck({ kind: 'invalid', status: res.data.status ?? 'UNKNOWN' });
        setValue('land.title_check', 'bad', { shouldValidate: true });
      } else {
        setTitleCheck({ kind: 'ok', division: res.data.division ?? '' });
        setValue('land.title_check', 'ok', { shouldValidate: true });
      }
    } catch {
      if (seq !== checkSeq.current) return;
      // Network hiccup — don't block the citizen; the server re-validates at submission
      setTitleCheck({ kind: 'error' });
      setValue('land.title_check', 'unknown', { shouldValidate: true });
    }
  }

  function titleCheckIndicator() {
    switch (titleCheck.kind) {
      case 'checking':
        return <Chip size="small" icon={<CircularProgress size={14} />} label={t('wizard.land.checking')} />;
      case 'ok':
        return (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleIcon />}
            label={`${t('wizard.land.validOnRecord')}${titleCheck.division ? ` — ${titleCheck.division}` : ''}`}
          />
        );
      case 'not-found':
        return <Chip size="small" color="error" icon={<CancelIcon />} label={t('wizard.land.notFound')} />;
      case 'invalid':
        return <Chip size="small" color="error" icon={<CancelIcon />} label={t('wizard.land.invalidStatus', { status: titleCheck.status })} />;
      case 'error':
        return <Chip size="small" color="warning" label={t('wizard.land.checkError')} />;
      default:
        return null;
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {t('wizard.land.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {needsSourceTitle
          ? isCarveOut
            ? t('wizard.land.subtitleCarveOut')
            : t('wizard.land.subtitleSourceTitle')
          : t('wizard.land.subtitleDescribe')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* ── Existing (mother) title — required for alienations, partition, mortgage ── */}
        {needsSourceTitle && (
          <Box
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'primary.light',
              borderRadius: 1,
              bgcolor: '#f4f8fc',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {isCarveOut ? t('wizard.land.motherTitle') : t('wizard.land.existingTitle')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {isCarveOut ? t('wizard.land.motherTitleHint') : t('wizard.land.existingTitleHint')}
            </Typography>
            <Controller
              name="land.title_no"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('wizard.land.titleNo')}
                  placeholder={t('wizard.land.titleNoPh')}
                  required
                  fullWidth
                  sx={{ maxWidth: 360 }}
                  error={!!errors.land?.title_no}
                  helperText={errors.land?.title_no?.message}
                  onBlur={(e) => {
                    field.onBlur();
                    void verifyTitleNo(e.target.value);
                  }}
                />
              )}
            />
            <Box sx={{ mt: 1.5 }}>{titleCheckIndicator()}</Box>
          </Box>
        )}

        {/* ── Mortgage details (hypothèque / mainlevée) ─────────────────────── */}
        {isMortgageType && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Controller
              name="mortgage.creditor"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ''}
                  label={
                    appType === 'MORTGAGE'
                      ? t('wizard.land.creditor')
                      : t('wizard.land.creditorRelease')
                  }
                  required={appType === 'MORTGAGE'}
                  error={!!errors.mortgage?.creditor}
                  helperText={errors.mortgage?.creditor?.message}
                  fullWidth
                />
              )}
            />
            {appType === 'MORTGAGE' && (
              <Controller
                name="mortgage.amount"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ''}
                    label={t('wizard.land.amount')}
                    type="number"
                    slotProps={{ htmlInput: { min: 0 } }}
                    fullWidth
                  />
                )}
              />
            )}
          </Box>
        )}

        {/* ── Parcel description — only when land will be surveyed ──────────── */}
        {needsLand && (
          <>
            {isCarveOut && (
              <Divider textAlign="left">
                <Typography variant="caption" color="text.secondary">
                  {t('wizard.land.portionDivider')}
                </Typography>
              </Divider>
            )}

            {/* Plot / Block / Subdivision / Division */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="land.plot_no"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.plotNo')}
                    required
                    error={!!errors.land?.plot_no}
                    helperText={errors.land?.plot_no?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="land.block_no"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.blockNo')}
                    required
                    error={!!errors.land?.block_no}
                    helperText={errors.land?.block_no?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="land.subdivision"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.subdivision')}
                    required
                    error={!!errors.land?.subdivision}
                    helperText={errors.land?.subdivision?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="land.division"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.division')}
                    required
                    error={!!errors.land?.division}
                    helperText={errors.land?.division?.message}
                    fullWidth
                  />
                )}
              />
            </Box>

            {/* Areas */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="land.area_main"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={isCarveOut ? t('wizard.land.areaPortion') : t('wizard.land.areaMain')}
                    type="number"
                    slotProps={{ htmlInput: { min: 0 } }}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="land.area_partition"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.areaPartition')}
                    type="number"
                    slotProps={{ htmlInput: { min: 0 } }}
                    fullWidth
                  />
                )}
              />
            </Box>

            {/* Locality + nature */}
            <Controller
              name="land.situation"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('wizard.land.locality')}
                  placeholder={t('wizard.land.localityPh')}
                  fullWidth
                />
              )}
            />
            <Controller
              name="land.nature"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('wizard.land.nature')}
                  placeholder={t('wizard.land.naturePh')}
                  fullWidth
                />
              )}
            />

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                {t('wizard.land.boundaries')}
              </Typography>
            </Divider>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="land.limit_north"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('wizard.land.north')} fullWidth />
                )}
              />
              <Controller
                name="land.limit_south"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('wizard.land.south')} fullWidth />
                )}
              />
              <Controller
                name="land.limit_east"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('wizard.land.east')} fullWidth />
                )}
              />
              <Controller
                name="land.limit_west"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label={t('wizard.land.west')} fullWidth />
                )}
              />
            </Box>

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                {t('wizard.land.developments')}
              </Typography>
            </Divider>

            <Controller
              name="land.developments"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('wizard.land.developmentsLabel')}
                  placeholder={t('wizard.land.developmentsPh')}
                  multiline
                  rows={2}
                  fullWidth
                />
              )}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="land.dev_value"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.land.devValue')}
                    type="number"
                    slotProps={{ htmlInput: { min: 0 } }}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="land.others_occupy"
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <FormLabel>{t('wizard.land.othersOccupy')}</FormLabel>
                    <RadioGroup
                      row
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label={t('wizard.land.yes')} />
                      <FormControlLabel value="no" control={<Radio />} label={t('wizard.land.no')} />
                    </RadioGroup>
                  </FormControl>
                )}
              />
            </Box>

            <Divider />

            {/* Layout plan questions */}
            <Controller
              name="land.has_layout_plan"
              control={control}
              render={({ field }) => (
                <FormControl>
                  <FormLabel>{t('wizard.land.hasLayoutPlan')}</FormLabel>
                  <RadioGroup
                    row
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label={t('wizard.land.yes')} />
                    <FormControlLabel value="no" control={<Radio />} label={t('wizard.land.no')} />
                  </RadioGroup>
                </FormControl>
              )}
            />

            {hasLayoutPlan === 'yes' && (
              <Controller
                name="land.plan_approved"
                control={control}
                render={({ field }) => (
                  <FormControl sx={{ pl: 2 }}>
                    <FormLabel>{t('wizard.land.planApproved')}</FormLabel>
                    <RadioGroup
                      row
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label={t('wizard.land.yes')} />
                      <FormControlLabel value="no" control={<Radio />} label={t('wizard.land.no')} />
                    </RadioGroup>
                  </FormControl>
                )}
              />
            )}

            <Divider />

            {/* Map pin selector */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                {t('wizard.land.gps')}
              </Typography>
              <MapPinSelector
                lat={lat}
                lng={lng}
                onChange={(newLat, newLng) => {
                  setValue('land.lat', newLat);
                  setValue('land.lng', newLng);
                }}
              />
            </Box>
          </>
        )}

        {/* Direct types: nothing to describe — the register already knows the parcel */}
        {!needsLand && (
          <Typography variant="body2" color="text.secondary">
            {t('wizard.land.noLandNeeded')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
