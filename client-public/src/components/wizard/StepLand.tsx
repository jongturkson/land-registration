import { useRef, useState } from 'react';
import { Controller, useWatch } from 'react-hook-form';
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
        return <Chip size="small" icon={<CircularProgress size={14} />} label="Checking the register…" />;
      case 'ok':
        return (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleIcon />}
            label={`VALID title on record${titleCheck.division ? ` — ${titleCheck.division} Division` : ''}`}
          />
        );
      case 'not-found':
        return <Chip size="small" color="error" icon={<CancelIcon />} label="No title with this number in the register" />;
      case 'invalid':
        return <Chip size="small" color="error" icon={<CancelIcon />} label={`Title is ${titleCheck.status} — cannot be operated on`} />;
      case 'error':
        return <Chip size="small" color="warning" label="Could not reach the register — it will be checked at submission" />;
      default:
        return null;
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Land Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {needsSourceTitle
          ? isCarveOut
            ? 'Identify the existing (mother) title, then describe the portion of land being acquired.'
            : 'Identify the existing title this application operates on.'
          : 'Describe the parcel of land as it appears on the survey plan.'}
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
              {isCarveOut ? 'Mother Land Title (Titre Mère)' : 'Existing Land Title'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {isCarveOut
                ? 'The number of the title from which your portion will be carved. It is checked live against the Land Register.'
                : 'The number as printed on the Titre Foncier. It is checked live against the Land Register.'}
            </Typography>
            <Controller
              name="land.title_no"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Land Title No."
                  placeholder="e.g. TF-2026-12345"
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
                      ? 'Creditor (bank / lender)'
                      : 'Creditor whose mortgage is being released'
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
                    label="Secured amount (FCFA)"
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
                  Description of the portion being acquired
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
                    label="Plot No."
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
                    label="Block No."
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
                    label="Sub-Division"
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
                    label="Division"
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
                    label={isCarveOut ? 'Approx. area of the portion (m²)' : 'Area of Main Title (m²)'}
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
                    label="Area to Partition / Transfer (m²)"
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
                  label="Locality / Place known as (Lieu-dit)"
                  placeholder="e.g. Bonadikombo, Mile 4"
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
                  label="Nature & Consistency of the Property"
                  placeholder="e.g. Urban developed plot of regular shape"
                  fullWidth
                />
              )}
            />

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Boundaries (Limites)
              </Typography>
            </Divider>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Controller
                name="land.limit_north"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="North (au Nord par)" fullWidth />
                )}
              />
              <Controller
                name="land.limit_south"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="South (au Sud par)" fullWidth />
                )}
              />
              <Controller
                name="land.limit_east"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="East (à l'Est par)" fullWidth />
                )}
              />
              <Controller
                name="land.limit_west"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="West (à l'Ouest par)" fullWidth />
                )}
              />
            </Box>

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Developments (Ce que supporte le terrain)
              </Typography>
            </Divider>

            <Controller
              name="land.developments"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Existing Developments on the Land"
                  placeholder="e.g. Dwelling house, cocoa plantation, permanent crops"
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
                    label="Approx. Value of Investments (FCFA)"
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
                    <FormLabel>Is the land occupied by other persons?</FormLabel>
                    <RadioGroup
                      row
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                      <FormControlLabel value="no" control={<Radio />} label="No" />
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
                  <FormLabel>Does the title have a layout plan?</FormLabel>
                  <RadioGroup
                    row
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                  >
                    <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                    <FormControlLabel value="no" control={<Radio />} label="No" />
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
                    <FormLabel>Is the layout plan approved?</FormLabel>
                    <RadioGroup
                      row
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value as 'yes' | 'no')}
                    >
                      <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                      <FormControlLabel value="no" control={<Radio />} label="No" />
                    </RadioGroup>
                  </FormControl>
                )}
              />
            )}

            <Divider />

            {/* Map pin selector */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Locality (GPS Coordinates)
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
            The parcel is already described in the Land Register under the title above — no land
            description or survey is needed for this application type.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
