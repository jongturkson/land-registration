import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link as MuiLink,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth, type AuthUser } from '../lib/auth';
import api from '../lib/api';

// Region names are proper nouns — identical in both languages
const REGIONS = [
  { value: 'fako', label: 'Fako (South West Region)' },
  { value: 'moungo', label: 'Moungo (Littoral Region)' },
  { value: 'wouri', label: 'Wouri (Littoral Region)' },
  { value: 'mezam', label: 'Mezam (North West Region)' },
  { value: 'mfoundi', label: 'Mfoundi (Centre Region)' },
];

// Messages hold i18n keys under register.errors.* — translated at render time
const RegisterSchema = z
  .object({
    full_name: z.string().min(2, 'nameMin'),
    email: z.string().email('emailInvalid'),
    phone: z.string().optional(),
    region: z.string().min(1, 'regionRequired'),
    password: z.string().min(8, 'passwordMin'),
    confirm_password: z.string().min(1, 'confirmRequired'),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'mismatch',
  });

type RegisterData = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
  const { t } = useTranslation();
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterData>({ resolver: zodResolver(RegisterSchema) });

  async function onSubmit(data: RegisterData) {
    setLoading(true);
    setError(null);
    try {
      const { confirm_password: _cp, ...payload } = data;
      const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/register', payload);
      setAuth(res.data.accessToken, res.data.user);
      navigate('/apply', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setError(t('register.errors.exists'));
        } else if (err.response?.status === 429) {
          setError(t('register.errors.tooMany'));
        } else {
          setError(err.response?.data?.message ?? t('register.errors.generic'));
        }
      } else {
        setError(t('register.errors.network'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ pt: { xs: 5, md: 8 }, pb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'secondary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </Box>
          <Typography variant="h5" gutterBottom sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}>
            {t('register.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('register.subtitle')}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Controller
              name="full_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('register.fullName')}
                  required
                  autoComplete="name"
                  autoFocus
                  error={!!errors.full_name}
                  helperText={errors.full_name && t(`register.errors.${errors.full_name.message}`)}
                  fullWidth
                />
              )}
            />

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('register.email')}
                  type="email"
                  required
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errors.email && t(`register.errors.${errors.email.message}`)}
                  fullWidth
                />
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('register.phone')}
                  type="tel"
                  autoComplete="tel"
                  error={!!errors.phone}
                  helperText={t('register.phoneHelp')}
                  fullWidth
                />
              )}
            />

            <Controller
              name="region"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label={t('register.region')}
                  required
                  error={!!errors.region}
                  helperText={
                    errors.region
                      ? t(`register.errors.${errors.region.message}`)
                      : t('register.regionHelp')
                  }
                  fullWidth
                >
                  {REGIONS.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('register.password')}
                  type="password"
                  required
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={
                    errors.password
                      ? t(`register.errors.${errors.password.message}`)
                      : t('register.passwordHelp')
                  }
                  fullWidth
                />
              )}
            />

            <Controller
              name="confirm_password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('register.confirmPassword')}
                  type="password"
                  required
                  autoComplete="new-password"
                  error={!!errors.confirm_password}
                  helperText={
                    errors.confirm_password &&
                    t(`register.errors.${errors.confirm_password.message}`)
                  }
                  fullWidth
                />
              )}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              disabled={loading}
              fullWidth
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {loading ? t('register.submitting') : t('register.submit')}
            </Button>

            <Typography variant="body2" align="center">
              {t('register.haveAccount')}{' '}
              <MuiLink component={Link} to="/login" underline="hover">
                {t('register.signInHere')}
              </MuiLink>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
