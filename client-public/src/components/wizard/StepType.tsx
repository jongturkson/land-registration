import { Controller } from 'react-hook-form';
import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { APP_TYPES, type WizardStepProps } from '../../schemas/wizard.schema';

export default function StepType({ form }: WizardStepProps) {
  const { control, formState: { errors } } = form;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Select Application Type
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose the type of land registration that matches your request.
      </Typography>

      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 2,
              }}
            >
              {APP_TYPES.map(({ value, label, desc }) => {
                const selected = field.value === value;
                return (
                  <Card
                    key={value}
                    variant="outlined"
                    sx={{
                      borderColor: selected ? 'primary.main' : 'divider',
                      borderWidth: selected ? 2 : 1,
                      backgroundColor: selected ? '#e8f0f7' : 'background.paper',
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}
                  >
                    <CardActionArea onClick={() => field.onChange(value)} sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography
                          gutterBottom
                          sx={{
                            fontWeight: selected ? 700 : 600,
                            color: selected ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {desc}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>

            {errors.type && (
              <Typography color="error" variant="caption" sx={{ mt: 1.5, display: 'block' }}>
                Please select an application type to continue.
              </Typography>
            )}
          </>
        )}
      />
    </Box>
  );
}
