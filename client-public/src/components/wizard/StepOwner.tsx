import { Controller, useWatch } from 'react-hook-form';
import {
  Box,
  Checkbox,
  Collapse,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { type WizardStepProps } from '../../schemas/wizard.schema';

export default function StepOwner({ form }: WizardStepProps) {
  const { t } = useTranslation();
  const { control, formState: { errors } } = form;
  const actingOnBehalf = useWatch({ control, name: 'owner.acting_on_behalf' });

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {t('wizard.owner.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('wizard.owner.subtitle')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Name + ID */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.full_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('wizard.owner.fullName')}
                required
                error={!!errors.owner?.full_name}
                helperText={errors.owner?.full_name?.message}
                fullWidth
              />
            )}
          />
          <Controller
            name="owner.id_card_no"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('wizard.owner.idCardNo')}
                required
                error={!!errors.owner?.id_card_no}
                helperText={errors.owner?.id_card_no?.message}
                fullWidth
              />
            )}
          />
        </Box>

        {/* Address */}
        <Controller
          name="owner.address"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('wizard.owner.address')}
              required
              multiline
              rows={2}
              error={!!errors.owner?.address}
              helperText={errors.owner?.address?.message}
              fullWidth
            />
          )}
        />

        {/* ID delivery date */}
        <Controller
          name="owner.id_delivered_on"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('wizard.owner.idDeliveredOn')}
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.owner?.id_delivered_on}
              helperText={errors.owner?.id_delivered_on?.message}
              sx={{ maxWidth: 280 }}
            />
          )}
        />

        <Divider textAlign="left">
          <Typography variant="caption" color="text.secondary">
            {t('wizard.owner.civilStatus')}
          </Typography>
        </Divider>

        {/* Parents */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.father_name"
            control={control}
            render={({ field }) => (
              <TextField {...field} label={t('wizard.owner.fatherName')} fullWidth />
            )}
          />
          <Controller
            name="owner.mother_name"
            control={control}
            render={({ field }) => (
              <TextField {...field} label={t('wizard.owner.motherName')} fullWidth />
            )}
          />
        </Box>

        {/* Birth + nationality + profession */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.birth_place"
            control={control}
            render={({ field }) => <TextField {...field} label={t('wizard.owner.birthPlace')} fullWidth />}
          />
          <Controller
            name="owner.birth_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('wizard.owner.birthDate')}
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            )}
          />
          <Controller
            name="owner.nationality"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('wizard.owner.nationality')}
                placeholder={t('wizard.owner.nationalityPh')}
                fullWidth
              />
            )}
          />
          <Controller
            name="owner.profession"
            control={control}
            render={({ field }) => <TextField {...field} label={t('wizard.owner.profession')} fullWidth />}
          />
        </Box>

        {/* Marital status + matrimonial regime */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.marital_status"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="marital-status-label">{t('wizard.owner.maritalStatus')}</InputLabel>
                <Select
                  labelId="marital-status-label"
                  label={t('wizard.owner.maritalStatus')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                >
                  <MenuItem value="SINGLE">{t('wizard.owner.single')}</MenuItem>
                  <MenuItem value="MARRIED">{t('wizard.owner.married')}</MenuItem>
                  <MenuItem value="WIDOWED">{t('wizard.owner.widowed')}</MenuItem>
                  <MenuItem value="DIVORCED">{t('wizard.owner.divorced')}</MenuItem>
                </Select>
              </FormControl>
            )}
          />
          <Controller
            name="owner.matrimonial_regime"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="matrimonial-regime-label">
                  {t('wizard.owner.matrimonialRegime')}
                </InputLabel>
                <Select
                  labelId="matrimonial-regime-label"
                  label={t('wizard.owner.matrimonialRegime')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                >
                  <MenuItem value="COMMUNITY">{t('wizard.owner.community')}</MenuItem>
                  <MenuItem value="SEPARATION">{t('wizard.owner.separation')}</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Box>

        <Divider />

        {/* Acting on behalf */}
        <Controller
          name="owner.acting_on_behalf"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value ?? false}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              }
              label={t('wizard.owner.actingOnBehalf')}
            />
          )}
        />

        <Collapse in={actingOnBehalf ?? false}>
          <Box
            sx={{
              pl: 2,
              borderLeft: '3px solid',
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">
              {t('wizard.owner.behalfTitle')}
            </Typography>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <Controller
                name="owner.behalf_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.owner.behalfName')}
                    error={!!errors.owner?.behalf_name}
                    helperText={errors.owner?.behalf_name?.message}
                    fullWidth
                  />
                )}
              />
              <Controller
                name="owner.behalf_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('wizard.owner.behalfId')}
                    error={!!errors.owner?.behalf_id}
                    helperText={errors.owner?.behalf_id?.message}
                    fullWidth
                  />
                )}
              />
            </Box>
            <Controller
              name="owner.behalf_address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('wizard.owner.behalfAddress')}
                  multiline
                  rows={2}
                  error={!!errors.owner?.behalf_address}
                  helperText={errors.owner?.behalf_address?.message}
                  fullWidth
                />
              )}
            />
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
