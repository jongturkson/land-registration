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
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth, type AuthUser } from '../lib/auth';
import api from '../lib/api';

const LoginSchema = z.object({
  email: z.string().email('emailInvalid'),
  password: z.string().min(1, 'passwordRequired'),
});
type LoginData = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/apply';

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(data: LoginData) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', data);
      setAuth(res.data.accessToken, res.data.user);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError(t('login.errors.invalid'));
        } else if (err.response?.status === 429) {
          setError(t('login.errors.tooMany'));
        } else {
          setError(t('login.errors.generic'));
        }
      } else {
        setError(t('login.errors.network'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ pt: { xs: 6, md: 10 }, pb: 8 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, sm: 4 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
            </svg>
          </Box>
          <Typography variant="h5" gutterBottom sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}>
            {t('login.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('login.subtitle')}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('login.email')}
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  error={!!errors.email}
                  helperText={errors.email && t(`login.errors.${errors.email.message}`)}
                  fullWidth
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('login.password')}
                  type="password"
                  required
                  autoComplete="current-password"
                  error={!!errors.password}
                  helperText={errors.password && t(`login.errors.${errors.password.message}`)}
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
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>

            <Typography variant="body2" align="center">
              {t('login.noAccount')}{' '}
              <MuiLink component={Link} to="/register" underline="hover">
                {t('login.createOne')}
              </MuiLink>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
