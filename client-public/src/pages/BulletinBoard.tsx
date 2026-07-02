import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import api from '../lib/api';
import { COLORS } from '../theme';

interface BulletinEntry {
  id: string;
  date: string;
  reference: string;
  summary: string;
}

export default function BulletinBoard() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => api.get<BulletinEntry[]>('/bulletins').then((r) => r.data),
  });

  // ── File Opposition modal state ────────────────────────────────────────
  const [oppositionFor, setOppositionFor] = useState<BulletinEntry | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [grounds, setGrounds] = useState('');
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );

  function closeDialog() {
    setOppositionFor(null);
    setName('');
    setContact('');
    setGrounds('');
  }

  const oppositionMutation = useMutation({
    mutationFn: (reference: string) =>
      api
        .post(`/applications/${reference}/dispute`, {
          opponent_name: name.trim(),
          ...(contact.trim() ? { opponent_contact: contact.trim() } : {}),
          grounds: grounds.trim(),
        })
        .then((r) => r.data),
    onSuccess: () => {
      closeDialog();
      setFeedback({ severity: 'success', text: t('bulletin.oppositionDialog.success') });
    },
    onError: (err: unknown) => {
      const text = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          t('bulletin.loadError'))
        : t('bulletin.loadError');
      setFeedback({ severity: 'error', text });
    },
  });

  const canSubmit =
    name.trim().length >= 2 && grounds.trim().length >= 10 && !oppositionMutation.isPending;

  return (
    <Box>
      {/* ── Header band ──────────────────────────────────────────── */}
      <Box
        sx={{
          background: `linear-gradient(150deg, ${COLORS.primary} 0%, #0d2d52 100%)`,
          color: 'white',
          py: { xs: 5, md: 7 },
          textAlign: 'center',
          px: 2,
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.75, letterSpacing: 2 }}>
          {t('bulletin.overline')}
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontFamily: "'Lora', serif",
            fontWeight: 700,
            fontSize: { xs: '1.8rem', sm: '2.4rem' },
            mt: 0.5,
          }}
        >
          {t('bulletin.title')}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.75, mt: 1 }}>
          {t('bulletin.subtitle')}
        </Typography>
      </Box>

      <Container maxWidth="md" sx={{ py: 5 }}>
        {/* ── Disclaimer banner ──────────────────────────────────── */}
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            mb: 4,
            borderColor: COLORS.ochre,
            borderWidth: 2,
            backgroundColor: '#FFF9EC',
            '& .MuiAlert-icon': { color: COLORS.ochre },
          }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>{t('bulletin.windowTitle')}</AlertTitle>
          {t('bulletin.windowBody')}
        </Alert>

        {feedback && (
          <Alert severity={feedback.severity} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>
            {feedback.text}
          </Alert>
        )}

        {/* ── Entries ────────────────────────────────────────────── */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && <Alert severity="error">{t('bulletin.loadError')}</Alert>}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <Alert severity="info">{t('bulletin.empty')}</Alert>
        )}

        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            {data!.map((entry, idx) => (
              <Box key={entry.id}>
                {idx > 0 && <Divider />}
                <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontWeight: 700,
                        color: COLORS.primary,
                        fontSize: '0.95rem',
                      }}
                    >
                      {entry.reference}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('bulletin.published')}{' '}
                      {new Date(entry.date).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 2 }}>
                    {entry.summary}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    sx={{ fontWeight: 700 }}
                    onClick={() => setOppositionFor(entry)}
                  >
                    {t('bulletin.fileOpposition')}
                  </Button>
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Container>

      {/* ── File Opposition modal ────────────────────────────────── */}
      <Dialog open={!!oppositionFor} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {t('bulletin.oppositionDialog.title', { reference: oppositionFor?.reference })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t('bulletin.oppositionDialog.body')}
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              label={t('bulletin.oppositionDialog.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('bulletin.oppositionDialog.contact')}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              fullWidth
            />
            <TextField
              required
              label={t('bulletin.oppositionDialog.grounds')}
              helperText={t('bulletin.oppositionDialog.groundsHelp')}
              multiline
              rows={4}
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={oppositionMutation.isPending}>
            {t('bulletin.oppositionDialog.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!canSubmit}
            onClick={() => oppositionFor && oppositionMutation.mutate(oppositionFor.reference)}
          >
            {oppositionMutation.isPending
              ? t('bulletin.oppositionDialog.submitting')
              : t('bulletin.oppositionDialog.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
