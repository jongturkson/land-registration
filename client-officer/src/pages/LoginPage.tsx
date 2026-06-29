import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import api from '../lib/api';
import { storeAuth, type OfficerUser } from '../lib/auth';

const schema = z.object({
  email: z.string().email({ message: 'Enter a valid email' }),
  password: z.string().min(1, { message: 'Required' }),
});

type FormData = z.infer<typeof schema>;

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: OfficerUser;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post<LoginResponse>('/auth/login', data).then((r) => r.data),
    onSuccess: ({ accessToken, refreshToken, user }) => {
      storeAuth(accessToken, refreshToken, user);
      navigate(user.role === 'surveyor' ? '/survey' : '/dashboard');
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setServerError('Email or password is incorrect.');
        } else if (error.response?.status === 429) {
          setServerError('Account locked. Try again later.');
        } else {
          setServerError('Something went wrong. Please try again.');
        }
      }
    },
  });

  const onSubmit = (data: FormData) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display:   'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'primary.main',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{
              fontFamily: '"Lora", "Source Serif 4", Georgia, serif',
              fontWeight: 700,
              color: 'primary.main',
              textAlign: 'center',
              mb: 4,
            }}
          >
            Land Registration
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              label="Email"
              type="email"
              fullWidth
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2 }}
            />
            <TextField
              {...register('password')}
              label="Password"
              type="password"
              fullWidth
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3 }}
            />

            {serverError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {serverError}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
