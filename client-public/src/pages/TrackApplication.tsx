import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import api from '../lib/api';

interface TrackedApplication {
  id: string;
  type: string;
  status: string;
  reference_no: string;
  created_at: string;
  updated_at: string;
  approvals: { step: string; signed_at: string }[];
}

// ── Statutory track per application type (mirrors the server state machine) ──

const CARVE_OUT_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);
const DIRECT_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE', 'MORTGAGE_RELEASE']);

interface JourneyStep {
  status: string;
  labelKey: string; // key under track.steps.*
  phase: 1 | 2;
}

const FULL_STEPS: JourneyStep[] = [
  { status: 'SUBMITTED', labelKey: 'submitted', phase: 1 },
  { status: 'RECEIPTED', labelKey: 'receipted', phase: 1 },
  { status: 'PUBLISHED', labelKey: 'published', phase: 1 },
  { status: 'SURVEYED', labelKey: 'surveyed', phase: 1 },
  { status: 'REGIONAL_REVIEW', labelKey: 'regionalReview', phase: 2 },
  { status: 'OPPOSITION_WINDOW', labelKey: 'oppositionWindow', phase: 2 },
  { status: 'CLEARED', labelKey: 'cleared', phase: 2 },
  { status: 'TITLE_ISSUED', labelKey: 'titleIssued', phase: 2 },
];

function stepsFor(type: string): JourneyStep[] {
  if (DIRECT_TYPES.has(type)) {
    return [
      { status: 'SUBMITTED', labelKey: 'submittedRegistrar', phase: 2 },
      { status: 'CLEARED', labelKey: 'deedVerified', phase: 2 },
      { status: 'COMPLETED', labelKey: 'registered', phase: 2 },
    ];
  }
  if (CARVE_OUT_TYPES.has(type)) {
    return [
      { status: 'SUBMITTED', labelKey: 'submittedRegistrar', phase: 2 },
      { status: 'SURVEY_ORDERED', labelKey: 'surveyOrdered', phase: 1 },
      { status: 'SURVEYED', labelKey: 'childDemarcated', phase: 1 },
      { status: 'CLEARED', labelKey: 'cleared', phase: 2 },
      { status: 'TITLE_ISSUED', labelKey: 'childTitleIssued', phase: 2 },
    ];
  }
  return FULL_STEPS;
}

// Citizen-facing guidance key (under track.next.*) for the current stage
function nextStepKey(type: string, status: string): string {
  const direct = DIRECT_TYPES.has(type);
  const carveOut = CARVE_OUT_TYPES.has(type);
  switch (status) {
    case 'SUBMITTED':
      return direct || carveOut ? 'submittedRegistrar' : 'submittedSdo';
    case 'RECEIPTED':
      return 'receipted';
    case 'PUBLISHED':
      return 'published';
    case 'SURVEY_ORDERED':
      return 'surveyOrdered';
    case 'SURVEYED':
      return carveOut ? 'surveyedCarveOut' : 'surveyedFull';
    case 'REGIONAL_REVIEW':
      return 'regionalReview';
    case 'OPPOSITION_WINDOW':
      return 'oppositionWindow';
    case 'CLEARED':
      return direct ? 'clearedDirect' : carveOut ? 'clearedCarveOut' : 'clearedFull';
    case 'TITLE_ISSUED':
      return 'titleIssued';
    case 'COMPLETED':
      return 'completed';
    case 'QUERIED':
      return 'queried';
    case 'REJECTED':
      return 'rejected';
    default:
      return '';
  }
}

export default function TrackApplication() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB';
  const theme = useTheme();
  // Horizontal steppers with up to 8 steps are unreadable on phones
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));

  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') ?? '';
  const [reference, setReference] = useState(initialRef);
  const [result, setResult] = useState<TrackedApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTrack(ref: string) {
    const trimmed = ref.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get<TrackedApplication>(
        `/applications/${encodeURIComponent(trimmed)}/track`,
      );
      setResult(res.data);
      setSearchParams({ ref: trimmed }, { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError(t('track.notFound'));
      } else {
        setError(t('track.generic'));
      }
    } finally {
      setLoading(false);
    }
  }

  const steps = result ? stepsFor(result.type) : [];
  const currentIndex = result ? steps.findIndex((s) => s.status === result.status) : -1;
  const halted = result?.status === 'QUERIED' || result?.status === 'REJECTED';

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        {t('track.overline')}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: { xs: '1.7rem', md: '2.1rem' } }}
      >
        {t('track.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('track.subtitle')}
      </Typography>

      <Paper
        component="form"
        elevation={1}
        onSubmit={(e) => {
          e.preventDefault();
          void handleTrack(reference);
        }}
        sx={{
          p: { xs: 2, sm: 3 },
          display: 'flex',
          gap: 2,
          alignItems: 'stretch',
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 3,
        }}
      >
        <TextField
          label={t('track.refLabel')}
          placeholder={t('track.refPlaceholder')}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{ htmlInput: { 'aria-label': t('track.refLabel') } }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !reference.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        >
          {loading ? t('track.checking') : t('track.submit')}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper elevation={2} sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
              mb: 0.5,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {result.reference_no}
            </Typography>
            <Chip
              label={
                halted
                  ? result.status === 'REJECTED'
                    ? t('track.rejected')
                    : t('track.queried')
                  : t('track.inProgress')
              }
              color={result.status === 'REJECTED' ? 'error' : halted ? 'warning' : 'primary'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t(`track.types.${result.type}`, { defaultValue: result.type })} ·{' '}
            {t('track.filedOn', {
              date: new Date(result.created_at).toLocaleDateString(dateLocale, {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              }),
            })}
          </Typography>

          {!halted && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {DIRECT_TYPES.has(result.type)
                  ? t('track.trackKinds.direct')
                  : CARVE_OUT_TYPES.has(result.type)
                    ? t('track.trackKinds.carveOut')
                    : t('track.trackKinds.full')}
              </Typography>
              <Stepper
                activeStep={currentIndex === -1 ? 0 : currentIndex}
                orientation={isPhone ? 'vertical' : 'horizontal'}
                alternativeLabel={!isPhone}
                sx={{ my: 3 }}
              >
                {steps.map((s, i) => (
                  <Step key={s.status} completed={currentIndex > i}>
                    <StepLabel
                      optional={
                        <Typography variant="caption" color="text.secondary">
                          {t('track.phase', { num: s.phase === 1 ? 'I' : 'II' })}
                        </Typography>
                      }
                    >
                      {t(`track.steps.${s.labelKey}`)}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Alert severity={result.status === 'REJECTED' ? 'error' : halted ? 'warning' : 'info'}>
            {t(`track.next.${nextStepKey(result.type, result.status)}`)}
          </Alert>

          {/* Processing history — the steps already taken by the offices */}
          {result.approvals.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                {t('track.historyTitle')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {result.approvals.map((a, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      gap: { xs: 1, sm: 2 },
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: 'text.secondary',
                        minWidth: 96,
                      }}
                    >
                      {new Date(a.signed_at).toLocaleDateString(dateLocale, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Typography>
                    <Typography variant="body2">{a.step}</Typography>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Paper>
      )}
    </Container>
  );
}
