import { Controller, useWatch } from 'react-hook-form';
import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { type WizardStepProps } from '../../schemas/wizard.schema';
import MapPinSelector from './MapPinSelector';

export default function StepLand({ form }: WizardStepProps) {
  const { control, setValue, formState: { errors } } = form;
  const hasLayoutPlan = useWatch({ control, name: 'land.has_layout_plan' });
  const lat = useWatch({ control, name: 'land.lat' });
  const lng = useWatch({ control, name: 'land.lng' });

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Land Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Describe the parcel of land as it appears on the survey plan or existing title.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Existing title number (optional) */}
        <Controller
          name="land.title_no"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Land Title No. (if existing)"
              placeholder="e.g. 123 / FAKO"
              fullWidth
              sx={{ maxWidth: 360 }}
            />
          )}
        />

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
                label="Area of Main Title (m²)"
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
      </Box>
    </Box>
  );
}
