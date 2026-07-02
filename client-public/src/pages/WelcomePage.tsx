import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { COLORS } from '../theme';

// Feature icons keyed to the i18n entries in welcome.features
const FEATURE_KEYS = [
  { icon: '📋', key: 'preApp' },
  { icon: '📍', key: 'gps' },
  { icon: '🧾', key: 'receipt' },
  { icon: '🔍', key: 'trackFeat' },
];

export default function WelcomePage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <Box>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          background: `linear-gradient(150deg, ${COLORS.primary} 0%, #0d2d52 100%)`,
          color: 'white',
          py: { xs: 8, md: 14 },
          textAlign: 'center',
          px: 2,
        }}
      >
        {/* Seal emblem */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: `3px solid ${COLORS.accent}`,
            boxShadow: `0 0 0 4px rgba(192,57,43,0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill={COLORS.accent}>
            <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
          </svg>
        </Box>

        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontFamily: "'Lora', serif",
            fontWeight: 700,
            mb: 1.5,
            fontSize: { xs: '1.9rem', sm: '2.6rem', md: '3.2rem' },
          }}
        >
          {t('welcome.title')}
        </Typography>

        <Typography
          variant="h6"
          component="p"
          sx={{ opacity: 0.8, mb: 1, fontWeight: 400 }}
        >
          {t('welcome.republic')}
        </Typography>
        <Typography
          variant="body1"
          component="p"
          sx={{ opacity: 0.65, mb: 1 }}
        >
          {t('welcome.registry')}
        </Typography>

        <Typography
          variant="body1"
          component="p"
          sx={{ opacity: 0.75, mb: 5, maxWidth: 560, mx: 'auto', mt: 2, lineHeight: 1.7 }}
        >
          {t('welcome.pitch')}
        </Typography>

        {/* CTAs */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <Button
              component={Link}
              to="/apply"
              variant="contained"
              color="secondary"
              size="large"
              sx={{ px: 5, fontWeight: 700 }}
            >
              {t('welcome.continueApplication')}
            </Button>
          ) : (
            <>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                color="secondary"
                size="large"
                sx={{ px: 5, fontWeight: 700 }}
              >
                {t('welcome.createAccount')}
              </Button>
              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.55)',
                  '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.08)' },
                }}
              >
                {t('welcome.signIn')}
              </Button>
            </>
          )}
          <Button
            component={Link}
            to="/track"
            variant="text"
            size="large"
            sx={{ color: 'rgba(255,255,255,0.65)', '&:hover': { color: 'white' } }}
          >
            {t('welcome.track')}
          </Button>
        </Box>
      </Box>

      {/* ── Features ───────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ py: 9 }}>
        <Typography
          variant="h5"
          align="center"
          gutterBottom
          sx={{ fontFamily: "'Lora', serif", fontWeight: 600, mb: 5 }}
        >
          {t('welcome.featuresTitle')}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 3,
          }}
        >
          {FEATURE_KEYS.map(({ icon, key }) => (
            <Paper key={key} variant="outlined" sx={{ p: 3 }}>
              <Typography sx={{ fontSize: '2.2rem', mb: 1.5 }}>{icon}</Typography>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                {t(`welcome.features.${key}.title`)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t(`welcome.features.${key}.desc`)}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Container>

      {/* ── Process steps ──────────────────────────────────────────── */}
      <Box sx={{ backgroundColor: '#f7f8fa', py: 8 }}>
        <Container maxWidth="sm">
          <Typography
            variant="h5"
            align="center"
            gutterBottom
            sx={{ fontFamily: "'Lora', serif", fontWeight: 600, mb: 4 }}
          >
            {t('welcome.howTitle')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { step: '1', label: t('welcome.steps.one') },
              { step: '2', label: t('welcome.steps.two') },
              { step: '3', label: t('welcome.steps.three') },
              { step: '4', label: t('welcome.steps.four') },
            ].map(({ step, label }) => (
              <Box key={step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: COLORS.primary,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                  }}
                >
                  {step}
                </Box>
                <Typography variant="body1" sx={{ pt: 0.6 }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ textAlign: 'center', mt: 5 }}>
            {!user && (
              <Button
                component={Link}
                to="/register"
                variant="contained"
                color="secondary"
                size="large"
                sx={{ px: 5, fontWeight: 700 }}
              >
                {t('welcome.getStarted')}
              </Button>
            )}
          </Box>
        </Container>
      </Box>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 3,
          textAlign: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {t('welcome.footer', { year: new Date().getFullYear() })}
        </Typography>
      </Box>
    </Box>
  );
}
