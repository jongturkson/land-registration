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
  approvals: { step: string; signed_at: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration (Immatriculation Directe)',
  PARTIAL_ALIENATION: 'Partial Alienation (Morcellement)',
  TOTAL_ALIENATION: 'Total Alienation (Mutation Totale)',
  STATE_LAND: 'State Land Concession',
  PARTITION: 'Property Partition (Partage)',
  MORTGAGE: 'Mortgage Inscription (Hypothèque)',
  MORTGAGE_RELEASE: 'Mortgage Release (Mainlevée)',
  TRANSFORMATION: 'Transformation',
};

// ── Statutory track per application type (mirrors the server state machine) ──

const CARVE_OUT_TYPES = new Set(['PARTIAL_ALIENATION', 'PARTITION']);
const DIRECT_TYPES = new Set(['TOTAL_ALIENATION', 'MORTGAGE', 'MORTGAGE_RELEASE']);

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
  if (DIRECT_TYPES.has(type)) {
    return [
      { status: 'SUBMITTED', label: 'Submitted to Registrar', phase: 2 },
      { status: 'CLEARED', label: 'Deed Verified', phase: 2 },
      { status: 'COMPLETED', label: 'Registered in Livre Foncier', phase: 2 },
    ];
  }
  if (CARVE_OUT_TYPES.has(type)) {
    return [
      { status: 'SUBMITTED', label: 'Submitted to Registrar', phase: 2 },
      { status: 'SURVEY_ORDERED', label: 'Survey Commissioned', phase: 1 },
      { status: 'SURVEYED', label: 'Child Parcel Demarcated', phase: 1 },
      { status: 'CLEARED', label: 'Cleared', phase: 2 },
      { status: 'TITLE_ISSUED', label: 'Child Title Issued', phase: 2 },
    ];
  }
  return FULL_STEPS;
}

// Citizen-facing guidance: what is happening now and what to expect next
function nextStepText(type: string, status: string): string {
  const direct = DIRECT_TYPES.has(type);
  const carveOut = CARVE_OUT_TYPES.has(type);
  switch (status) {
    case 'SUBMITTED':
      return direct || carveOut
        ? 'Your file is on the desk of the Land Registrar (Conservateur Foncier), who will verify your deed against the existing title. No action is needed from you.'
        : 'Your file is with the Sub-Divisional Office, which will verify it and issue your official receipt (Récépissé). No action is needed from you.';
    case 'RECEIPTED':
      return 'Your Récépissé has been issued. The SDO will now order the public notice and convene the Consultative Commission for the site visit.';
    case 'PUBLISHED':
      return 'A public notice about your application has been posted. Next: the Consultative Commission will visit your land and the sworn surveyor will demarcate the boundaries (bornage). Please be available to attend.';
    case 'SURVEY_ORDERED':
      return 'The Registrar has verified your deed and commissioned the survey. The sworn surveyor will demarcate your portion inside the mother title boundary — please be available to attend.';
    case 'SURVEYED':
      return carveOut
        ? 'Your portion has been demarcated inside the mother title. The Registrar will now verify the survey and clear the file for your new title.'
        : 'Your land has been surveyed. The dossier is being assembled and forwarded to the Regional Delegation for review.';
    case 'REGIONAL_REVIEW':
      return 'Your dossier is under regional review. Once approved, a 30-day public opposition window opens — this is a legal requirement for first registrations.';
    case 'OPPOSITION_WINDOW':
      return 'The 30-day opposition window is open. Anyone claiming a right over the land may file an opposition during this period. If none is upheld, your file will be cleared.';
    case 'CLEARED':
      return direct
        ? 'Your deed is verified. The Land Registrar will now execute the entry (transfer, mortgage or release) on the existing title.'
        : carveOut
          ? 'Your file is cleared. The Land Registrar will now issue your new title and reduce the mother parcel accordingly.'
          : 'Your file is cleared. The Land Registrar (Conservateur Foncier) will now enter the parcel in the Land Register and issue your Land Certificate.';
    case 'TITLE_ISSUED':
      return 'Congratulations — your Land Certificate (Titre Foncier) has been issued. Sign in and open My Applications to download it, or collect your copy at the Divisional Registry, Buea.';
    case 'COMPLETED':
      return 'Done — the entry has been executed on the title in the Land Register. The updated title can be confirmed at any time through the public verification portal.';
    case 'QUERIED':
      return 'An officer has raised a query on your file. Sign in and open My Applications to read exactly what needs correcting, or contact the Divisional Registry, Buea, with your Récépissé.';
    case 'REJECTED':
      return 'Your application was rejected. Sign in and open My Applications to read the grounds, or contact the Divisional Registry, Buea, with your Récépissé.';
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
                {DIRECT_TYPES.has(result.type)
                  ? 'REGISTRAR-DIRECT — ENTRY ON THE EXISTING TITLE'
                  : CARVE_OUT_TYPES.has(result.type)
                    ? 'REGISTRAR-LED CARVE-OUT (MORCELLEMENT)'
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

          {/* Processing history — the steps already taken by the offices */}
          {result.approvals.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Processing History
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {result.approvals.map((a, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: 'text.secondary',
                        minWidth: 96,
                      }}
                    >
                      {new Date(a.signed_at).toLocaleDateString('en-GB', {
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
