import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import api from '../lib/api';
import { getUser } from '../lib/auth';

interface Applicant {
  full_name: string;
  email: string | null;
}

interface Application {
  id: string;
  type: string;
  status: string;
  reference_no: string | null;
  created_at: string;
  applicant: Applicant;
}

// ── Role configuration ─────────────────────────────────────────────────────

interface RoleConfig {
  title: string;
  subtitle: string;
  mandate: string;
  accentColor: string;
  /** Statuses this role acts on — empty set means show all */
  activeStatuses: Set<string>;
  /** Statuses to show as "recently completed" context */
  contextStatuses: Set<string>;
  buttonLabel: string;
}

function getRoleConfig(role: string): RoleConfig {
  switch (role) {
    case 'sub_divisional_officer':
      return {
        title: 'Sub-Divisional Office',
        subtitle: 'Fako Division · Reception & Publication Desk',
        mandate:
          'You receive applications from citizens, issue the official receipt (récépissé), and order the mandatory public notice that opens Phase I of registration.',
        accentColor: '#5c35b5',       // deep violet — government authority
        activeStatuses: new Set(['SUBMITTED', 'RECEIPTED']),
        contextStatuses: new Set(['PUBLISHED']),
        buttonLabel: 'Review',
      };

    case 'divisional_delegate':
      return {
        title: 'Divisional Delegation of Land Tenure',
        subtitle: 'Fako Division · Dossier Assembly',
        mandate:
          'You assemble the complete post-survey dossier — survey report, boundary plan and commission minutes — verify its legal regularity, and transmit it to the Regional Delegation.',
        accentColor: '#0277bd',       // deep blue — administrative document work
        activeStatuses: new Set(['SURVEYED']),
        contextStatuses: new Set(['REGIONAL_REVIEW']),
        buttonLabel: 'Open Dossier',
      };

    case 'registrar':
      return {
        title: 'Conservation Foncière',
        subtitle: 'Fako Division · Land Register',
        mandate:
          'You are the Conservateur Foncier — the final statutory authority. Alienations, partitions, mortgages and releases land directly on your desk: you verify the deed and the mother title, commission carve-out surveys, open the opposition window on first registrations, and execute every entry in the Livre Foncier.',
        accentColor: '#b45309',       // amber-gold — highest authority, "last bus stop"
        // SUBMITTED/SURVEYED appear here only for registrar-led tracks —
        // the server scopes the queue so full-track files stay with the SDO
        activeStatuses: new Set([
          'SUBMITTED',
          'SURVEYED',
          'REGIONAL_REVIEW',
          'OPPOSITION_WINDOW',
          'CLEARED',
        ]),
        contextStatuses: new Set(['SURVEY_ORDERED', 'TITLE_ISSUED', 'COMPLETED']),
        buttonLabel: 'Open File',
      };

    default:
      return {
        title: 'Applications',
        subtitle: 'All incoming applications',
        mandate: '',
        accentColor: '#1976d2',
        activeStatuses: new Set<string>(),
        contextStatuses: new Set<string>(),
        buttonLabel: 'View',
      };
  }
}

// ── Lookup tables ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration',
  PARTIAL_ALIENATION: 'Partial Alienation',
  TOTAL_ALIENATION: 'Total Alienation',
  STATE_LAND: 'State Land',
  PARTITION: 'Partition',
  MORTGAGE: 'Mortgage',
  MORTGAGE_RELEASE: 'Mortgage Release',
  TRANSFORMATION: 'Transformation',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  RECEIPTED: 'Receipted',
  PUBLISHED: 'Public Notice',
  BOARD_SCHEDULED: 'Board Scheduled',
  SURVEY_ORDERED: 'Survey Ordered',
  SURVEYED: 'Surveyed',
  REGIONAL_REVIEW: 'Regional Review',
  OPPOSITION_WINDOW: 'Opposition Window',
  CLEARED: 'Cleared',
  TITLE_ISSUED: 'Title Issued',
  COMPLETED: 'Registered',
  QUERIED: 'Queried',
  REJECTED: 'Rejected',
};

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

function statusColor(status: string): ChipColor {
  switch (status) {
    case 'SUBMITTED': return 'info';
    case 'RECEIPTED': return 'primary';
    case 'PUBLISHED': return 'warning';
    case 'SURVEY_ORDERED': return 'warning';
    case 'SURVEYED': return 'secondary';
    case 'REGIONAL_REVIEW': return 'info';
    case 'OPPOSITION_WINDOW': return 'warning';
    case 'CLEARED': return 'primary';
    case 'TITLE_ISSUED': return 'success';
    case 'COMPLETED': return 'success';
    case 'QUERIED': return 'warning';
    case 'REJECTED': return 'error';
    default: return 'default';
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const config = getRoleConfig(user?.role ?? '');

  const { data: allApplications, isLoading, isError } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get<Application[]>('/applications').then((r) => r.data),
  });

  // Split into active queue vs recently-handled context
  const active = (allApplications ?? []).filter(
    (a) =>
      config.activeStatuses.size === 0 ||
      config.activeStatuses.has(a.status) ||
      a.status === 'QUERIED' ||
      a.status === 'REJECTED',
  );
  const recent = (allApplications ?? []).filter((a) => config.contextStatuses.has(a.status));

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load applications. Please refresh the page.</Alert>
      </Box>
    );
  }

  const total = allApplications?.length ?? 0;
  const queried = (allApplications ?? []).filter((a) => a.status === 'QUERIED').length;
  const completed = (allApplications ?? []).filter(
    (a) => a.status === 'TITLE_ISSUED' || a.status === 'COMPLETED',
  ).length;

  const kpis = [
    { label: 'In Your Queue', value: active.length, color: config.accentColor },
    { label: 'Total in Region', value: total, color: '#37474f' },
    { label: 'Queried', value: queried, color: '#b45309' },
    { label: 'Titles Issued', value: completed, color: '#2e7d32' },
  ];

  return (
    <Box>
      {/* Role identity banner — official seal, gradient in the role's colour */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${config.accentColor} 0%, #16213e 140%)`,
          color: 'white',
          px: { xs: 2.5, md: 4 },
          pt: 3,
          pb: 7,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Oversized watermark emblem */}
        <Box
          component="svg"
          viewBox="0 0 24 24"
          sx={{
            position: 'absolute',
            right: -30,
            top: -40,
            width: 260,
            height: 260,
            opacity: 0.08,
            fill: 'white',
            pointerEvents: 'none',
          }}
        >
          <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6L23 9 12 3zm-1 12.99L7 13.5v-3.42L11 12v3.99zm2 0V12l4-1.92v3.42L13 15.99z" />
        </Box>

        <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 2 }}>
          Republic of Cameroon —{' '}
          {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontFamily: '"Lora", serif',
            fontWeight: 700,
            mb: 0.5,
            fontSize: { xs: '1.6rem', md: '2.1rem' },
          }}
        >
          {config.title}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mb: config.mandate ? 1.5 : 0 }}>
          {config.subtitle}
        </Typography>
        {config.mandate && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              maxWidth: 720,
              opacity: 0.75,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {config.mandate}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: { xs: 2, md: 4 }, pb: 4 }}>
        {/* KPI cards overlapping the banner */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mt: -4.5,
            mb: 4,
          }}
        >
          {kpis.map((kpi) => (
            <Paper
              key={kpi.label}
              elevation={2}
              sx={{
                p: 2,
                borderTop: `4px solid ${kpi.color}`,
                borderRadius: 2,
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1, lineHeight: 1.4, display: 'block' }}
              >
                {kpi.label}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: kpi.color }}>
                {kpi.value}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Active queue */}
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Action Queue
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {config.activeStatuses.size > 0
            ? `Applications awaiting your action (${[...config.activeStatuses].map((s) => STATUS_LABELS[s] ?? s).join(', ')})`
            : 'All applications in your region'}
        </Typography>

        {active.length === 0 ? (
          <Alert severity="info" sx={{ mb: 4 }}>
            Your action queue is empty — no applications are currently at your stage.
          </Alert>
        ) : (
          <TableContainer component={Paper} elevation={1} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Reference No.</TableCell>
                  <TableCell>Applicant</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {active.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}>
                      {app.reference_no ?? '—'}
                    </TableCell>
                    <TableCell>{app.applicant.full_name}</TableCell>
                    <TableCell>{TYPE_LABELS[app.type] ?? app.type}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[app.status] ?? app.status}
                        color={statusColor(app.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(app.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: config.accentColor, color: config.accentColor }}
                        onClick={() => navigate(`/applications/${app.id}`)}
                      >
                        {config.buttonLabel}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Recently processed context panel */}
        {recent.length > 0 && (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Recently Processed
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Files you have advanced — included for reference.
            </Typography>
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                    <TableCell>Reference No.</TableCell>
                    <TableCell>Applicant</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map((app) => (
                    <TableRow key={app.id} hover sx={{ opacity: 0.7 }}>
                      <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}>
                        {app.reference_no ?? '—'}
                      </TableCell>
                      <TableCell>{app.applicant.full_name}</TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[app.status] ?? app.status}
                          color={statusColor(app.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(app.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="text"
                          sx={{ color: 'text.secondary' }}
                          onClick={() => navigate(`/applications/${app.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Box>
    </Box>
  );
}
