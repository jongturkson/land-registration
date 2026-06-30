import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Container,
  Divider,
  Paper,
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bulletins'],
    queryFn: () => api.get<BulletinEntry[]>('/bulletins').then((r) => r.data),
  });

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
        <Typography
          variant="overline"
          sx={{ opacity: 0.75, letterSpacing: 2 }}
        >
          Republic of Cameroon — Divisional Registry, Buea
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
          Public Digital Bulletin
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.75, mt: 1 }}>
          Bulletin des Avis Fonciers
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
          <AlertTitle sx={{ fontWeight: 700 }}>30-Day Opposition Window</AlertTitle>
          Each notice below opens a statutory <strong>30-day period</strong>, counted from
          its publication date, during which any interested party may lodge a formal
          opposition (<em>mainlevée</em>) or a demand for inscription of right
          (<em>demande d'inscription de droit</em>) against the parcel concerned. Such
          claims must be lodged in person at the Divisional Registry office before the
          window closes — claims received after this deadline will not be considered.
        </Alert>

        {/* ── Entries ────────────────────────────────────────────── */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error">
            Unable to load the bulletin right now. Please try again shortly.
          </Alert>
        )}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <Alert severity="info">No notices have been published yet.</Alert>
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
                      Published{' '}
                      {new Date(entry.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                    {entry.summary}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Paper>
        )}
      </Container>
    </Box>
  );
}
