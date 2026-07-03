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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import api from '../lib/api';

interface TrackedApplication {
  id: string;
  type: string;
  status: string;
  reference_no: string;
  created_at: string;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration (Immatriculation Directe)',
  PARTIAL_ALIENATION: 'Partial Alienation (Morcellement)',
  TOTAL_ALIENATION: 'Total Alienation (Mutation Totale)',
  STATE_LAND: 'State Land Concession',
  PARTITION: 'Property Partition (Partage)',
  MORTGAGE: 'Mortgage Inscription (Hypothèque)',
  TRANSFORMATION: 'Transformation',
};

// ── Statutory track per application type (mirrors the server state machine) ──

const FAST_TRACK_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE']);
const NO_OPPOSITION_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);

interface JourneyStep {
  status: string;
  label: string;
  phase: 1 | 2;
}

const FULL_STEPS: JourneyStep[] = [
  { status: 'SUBMITTED', label: 'Submitted', phase: 1 },
  { status: 'RECEIPTED', label: 'Récépissé Issued', phase: 1 },
  { status: 'PUBLISHED', label: 'Public Notice', phase: 1 },
  { status: 'SURVEYED', label: 'Land Surveyed (Bornage)', phase: 1 },
  { status: 'REGIONAL_REVIEW', label: 'Regional Review', phase: 2 },
  { status: 'OPPOSITION_WINDOW', label: '30-Day Opposition Window', phase: 2 },
  { status: 'CLEARED', label: 'Cleared', phase: 2 },
  { status: 'TITLE_ISSUED', label: 'Title Issued', phase: 2 },
];

function stepsFor(type: string): JourneyStep[] {
  if (FAST_TRACK_TYPES.has(type)) {
    return [
      { status: 'SUBMITTED', label: 'Submitted', phase: 2 },
      { status: 'RECEIPTED', label: 'Récépissé Issued', phase: 2 },
      { status: 'CLEARED', label: 'Notarial Act Verified', phase: 2 },
      { status: 'TITLE_ISSUED', label: 'Mutation Registered', phase: 2 },
    ];
  }
  if (NO_OPPOSITION_TYPES.has(type)) {
    return FULL_STEPS.filter((s) => s.status !== 'OPPOSITION_WINDOW');
  }
  return FULL_STEPS;
}

// Citizen-facing guidance: what is happening now and what to expect next
function nextStepText(type: string, status: string): string {
  const fast = FAST_TRACK_TYPES.has(type);
  switch (status) {
    case 'SUBMITTED':
      return 'Your file is with the Sub-Divisional Office, which will verify it and issue your official receipt (Récépissé). No action is needed from you.';
    case 'RECEIPTED':
      return fast
        ? 'Your Récépissé has been issued. Your notarial act is being examined by the Land Registrar (Conservateur Foncier) — this type of file skips the public notice phase.'
        : 'Your Récépissé has been issued. The SDO will now order the public notice and convene the Consultative Commission for the site visit.';
    case 'PUBLISHED':
      return 'A public notice about your application has been posted. Next: the Consultative Commission will visit your land and the sworn surveyor will demarcate the boundaries (bornage). Please be available to attend.';
    case 'SURVEYED':
      return 'Your land has been surveyed. The dossier is being assembled and forwarded to the Regional Delegation for review.';
    case 'REGIONAL_REVIEW':
      return fast || NO_OPPOSITION_TYPES.has(type)
        ? 'Your dossier is under regional review. Once verified it will be cleared for registration.'
        : 'Your dossier is under regional review. Once approved, a 30-day public opposition window opens — this is a legal requirement for first registrations.';
    case 'OPPOSITION_WINDOW':
      return 'The 30-day opposition window is open. Anyone claiming a right over the land may file an opposition during this period. If none is upheld, your file will be cleared.';
    case 'CLEARED':
      return 'Your file is cleared. The Land Registrar (Conservateur Foncier) will now enter the parcel in the Land Register and issue your Land Certificate.';
    case 'TITLE_ISSUED':
      return 'Congratulations — your Land Certificate (Titre Foncier) has been issued. You may collect your copy at the Divisional Registry, Buea.';
    case 'QUERIED':
      return 'An officer has raised a query on your file. Please contact the Divisional Registry, Buea, with your Récépissé to resolve it.';
    case 'REJECTED':
      return 'Your application was rejected. Contact the Divisional Registry, Buea, with your Récépissé to learn the grounds and your options.';
    default:
      return '';
  }
}

export default function TrackApplication() {
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
        setError('No application found for that reference number. Check your Récépissé and try again.');
      } else {
        setError('Unable to check your application right now. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  }

  const steps = result ? stepsFor(result.type) : [];
  const currentIndex = result ? steps.findIndex((s) => s.status === result.status) : -1;
  const halted = result?.status === 'QUERIED' || result?.status === 'REJECTED';

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Typography variant="overline" color="text.secondary">
        Republic of Cameroon — Divisional Registry, Buea
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700 }}
      >
        Track Your Application
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Enter the reference number printed on your Récépissé to see exactly where your file is
        in the registration journey — and what happens next.
      </Typography>

      <Paper
        component="form"
        elevation={1}
        onSubmit={(e) => {
          e.preventDefault();
          void handleTrack(reference);
        }}
        sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap', mb: 3 }}
      >
        <TextField
          label="Récépissé Reference Number"
          placeholder="e.g. APP-2026-123456"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          sx={{ flex: 1, minWidth: 240 }}
          slotProps={{ htmlInput: { 'aria-label': 'Reference number' } }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || !reference.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
        >
          {loading ? 'Checking…' : 'Track'}
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
              label={halted ? (result.status === 'REJECTED' ? 'Rejected' : 'Query Raised') : 'In Progress'}
              color={result.status === 'REJECTED' ? 'error' : halted ? 'warning' : 'primary'}
              sx={{ fontWeight: 700 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {TYPE_LABELS[result.type] ?? result.type} · filed on{' '}
            {new Date(result.created_at).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Typography>

          {!halted && (
            <>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {FAST_TRACK_TYPES.has(result.type)
                  ? 'NOTARIAL FAST-TRACK — REGISTRATION PHASE ONLY'
                  : 'PHASE I — ESTABLISHING THE GROUND TRUTH · PHASE II — REGISTRATION'}
              </Typography>
              <Stepper
                activeStep={currentIndex === -1 ? 0 : currentIndex}
                alternativeLabel
                sx={{ my: 3 }}
              >
                {steps.map((s, i) => (
                  <Step key={s.status} completed={currentIndex > i}>
                    <StepLabel
                      optional={
                        <Typography variant="caption" color="text.secondary">
                          Phase {s.phase === 1 ? 'I' : 'II'}
                        </Typography>
                      }
                    >
                      {s.label}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Divider sx={{ mb: 2 }} />
            </>
          )}

          <Alert severity={result.status === 'REJECTED' ? 'error' : halted ? 'warning' : 'info'}>
            {nextStepText(result.type, result.status)}
          </Alert>
        </Paper>
      )}
    </Container>
  );
}
