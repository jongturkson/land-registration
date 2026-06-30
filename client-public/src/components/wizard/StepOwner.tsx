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
import { type WizardStepProps } from '../../schemas/wizard.schema';

export default function StepOwner({ form }: WizardStepProps) {
  const { control, formState: { errors } } = form;
  const actingOnBehalf = useWatch({ control, name: 'owner.acting_on_behalf' });

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Owner Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enter the details of the person in whose name the title will be registered.
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
                label="Full Name & Surname"
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
                label="National ID Card No."
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
              label="Complete Address"
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
              label="ID Card Delivered On"
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
            Civil Status (État civil du propriétaire)
          </Typography>
        </Divider>

        {/* Parents */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.father_name"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Father's Name (Fils/Fille de)" fullWidth />
            )}
          />
          <Controller
            name="owner.mother_name"
            control={control}
            render={({ field }) => (
              <TextField {...field} label="Mother's Name (et de)" fullWidth />
            )}
          />
        </Box>

        {/* Birth + nationality + profession */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.birth_place"
            control={control}
            render={({ field }) => <TextField {...field} label="Place of Birth" fullWidth />}
          />
          <Controller
            name="owner.birth_date"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Date of Birth"
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
              <TextField {...field} label="Nationality" placeholder="e.g. Cameroonian" fullWidth />
            )}
          />
          <Controller
            name="owner.profession"
            control={control}
            render={({ field }) => <TextField {...field} label="Profession / Occupation" fullWidth />}
          />
        </Box>

        {/* Marital status + matrimonial regime */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Controller
            name="owner.marital_status"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="marital-status-label">Marital Status</InputLabel>
                <Select
                  labelId="marital-status-label"
                  label="Marital Status"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                >
                  <MenuItem value="SINGLE">Single</MenuItem>
                  <MenuItem value="MARRIED">Married</MenuItem>
                  <MenuItem value="WIDOWED">Widowed</MenuItem>
                  <MenuItem value="DIVORCED">Divorced</MenuItem>
                </Select>
              </FormControl>
            )}
          />
          <Controller
            name="owner.matrimonial_regime"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel id="matrimonial-regime-label">Matrimonial Regime</InputLabel>
                <Select
                  labelId="matrimonial-regime-label"
                  label="Matrimonial Regime"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                >
                  <MenuItem value="COMMUNITY">Community of Property</MenuItem>
                  <MenuItem value="SEPARATION">Separation of Property</MenuItem>
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
              label="I am acting on behalf of someone else (mandataire)"
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
              Details of the person being represented
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
                    label="Full Name"
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
                    label="ID Card No."
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
                  label="Address"
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
