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
import axios from 'axios';
import { useAuth, type AuthUser } from '../lib/auth';
import api from '../lib/api';

const REGIONS = [
  { value: 'fako', label: 'Fako (South West Region)' },
  { value: 'moungo', label: 'Moungo (Littoral Region)' },
  { value: 'wouri', label: 'Wouri (Littoral Region)' },
  { value: 'mezam', label: 'Mezam (North West Region)' },
  { value: 'mfoundi', label: 'Mfoundi (Centre Region)' },
];

const RegisterSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    phone: z.string().optional(),
    region: z.string().min(1, 'Please select your region'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });

type RegisterData = z.infer<typeof RegisterSchema>;

export default function RegisterPage() {
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
          setError('An account with this email already exists. Please sign in instead.');
        } else if (err.response?.status === 429) {
          setError('Too many registration attempts. Please try again later.');
        } else {
          setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
        }
      } else {
        setError('Network error. Please check your connection.');
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
            Create an Account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Register to begin your land title pre-application.
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
                  label="Full Name"
                  required
                  autoComplete="name"
                  autoFocus
                  error={!!errors.full_name}
                  helperText={errors.full_name?.message}
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
                  label="Email Address"
                  type="email"
                  required
                  autoComplete="email"
                  error={!!errors.email}
                  helperText={errors.email?.message}
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
                  label="Phone Number (optional)"
                  type="tel"
                  autoComplete="tel"
                  error={!!errors.phone}
                  helperText={errors.phone?.message ?? 'e.g. +237 677 000 000'}
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
                  label="Region / Division"
                  required
                  error={!!errors.region}
                  helperText={errors.region?.message ?? 'Select the region where your land is located'}
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
                  label="Password"
                  type="password"
                  required
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={errors.password?.message ?? 'At least 8 characters'}
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
                  label="Confirm Password"
                  type="password"
                  required
                  autoComplete="new-password"
                  error={!!errors.confirm_password}
                  helperText={errors.confirm_password?.message}
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
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>

            <Typography variant="body2" align="center">
              Already have an account?{' '}
              <MuiLink component={Link} to="/login" underline="hover">
                Sign in here
              </MuiLink>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
