import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../../lib/api';

interface Settings {
  current_taxation_rate: number;
  opposition_window_days: number;
  system_maintenance_mode: boolean;
  updated_at: string;
}

export default function SystemSettings() {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.get<Settings>('/admin/settings').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !settings) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load system settings. Please refresh the page.</Alert>
      </Box>
    );
  }

  return <SettingsForm settings={settings} />;
}

// Draft state initialises from the loaded server copy; after a save the local
// values already match the server, so no re-synchronisation is needed.
function SettingsForm({ settings }: { settings: Settings }) {
  const queryClient = useQueryClient();

  const [taxRate, setTaxRate] = useState(String(settings.current_taxation_rate));
  const [windowDays, setWindowDays] = useState(String(settings.opposition_window_days));
  const [maintenance, setMaintenance] = useState(settings.system_maintenance_mode);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  );

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Settings>) =>
      api.put('/admin/settings', payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setFeedback({ kind: 'success', text: 'Settings saved. Changes take effect immediately.' });
    },
    onError: (err: unknown) => {
      const text = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Failed to save settings.')
        : 'Failed to save settings.';
      setFeedback({ kind: 'error', text });
    },
  });

  const parsedRate = Number(taxRate);
  const parsedDays = Number(windowDays);
  const rateValid = taxRate !== '' && !Number.isNaN(parsedRate) && parsedRate >= 0 && parsedRate <= 100;
  const daysValid =
    windowDays !== '' && Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365;

  function handleSave() {
    setFeedback(null);
    saveMutation.mutate({
      current_taxation_rate: parsedRate,
      opposition_window_days: parsedDays,
      system_maintenance_mode: maintenance,
    });
  }

  return (
    <Box sx={{ p: 4, maxWidth: 720 }}>
      <Typography variant="h5" component="h1" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
        System Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Dynamic global configuration. Every change is written to the audit ledger with your
        identity. Last updated{' '}
        {new Date(settings.updated_at).toLocaleString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
        .
      </Typography>

      {feedback && (
        <Alert severity={feedback.kind} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      <Card elevation={1} sx={{ mb: 2 }}>
        <CardHeader
          title="Statutory Parameters"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Cumulative Taxation Rate (alienations)"
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            error={!rateValid}
            helperText={
              rateValid
                ? 'Applied to total and partial alienations (registration duties, mutation taxes).'
                : 'Enter a percentage between 0 and 100.'
            }
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
              htmlInput: { min: 0, max: 100, step: 0.5 },
            }}
            sx={{ maxWidth: 360 }}
          />
          <TextField
            label="Opposition Window Duration"
            type="number"
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
            error={!daysValid}
            helperText={
              daysValid
                ? 'Statutory public opposition period for first registrations (default 30 days).'
                : 'Enter a whole number of days between 1 and 365.'
            }
            slotProps={{
              input: { endAdornment: <InputAdornment position="end">days</InputAdornment> },
              htmlInput: { min: 1, max: 365, step: 1 },
            }}
            sx={{ maxWidth: 360 }}
          />
        </CardContent>
      </Card>

      <Card elevation={1} sx={{ mb: 3, borderLeft: maintenance ? '4px solid #d32f2f' : undefined }}>
        <CardHeader
          title="Maintenance Mode"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          <FormControlLabel
            control={
              <Switch
                checked={maintenance}
                onChange={(_e, checked) => setMaintenance(checked)}
                color="error"
              />
            }
            label={maintenance ? 'Maintenance mode is ON' : 'Maintenance mode is off'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            While maintenance mode is on, all submissions and processing actions across the
            citizen portal and officer desks are refused with a maintenance notice. Read-only
            access (tracking, verification, the public bulletin) remains available, and the
            admin console stays reachable so you can switch it back off.
          </Typography>
          {maintenance && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Saving with maintenance mode ON will immediately pause the platform for all
              citizens and officers.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        disabled={!rateValid || !daysValid || saveMutation.isPending}
        onClick={handleSave}
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
      </Button>
    </Box>
  );
}
