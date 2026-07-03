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
          'You are the Conservateur Foncier — the final statutory authority. You verify notarial acts on fast-track transfers, open the opposition window on first registrations, clear uncontested files, and enter the parcel in the Livre Foncier to issue the Land Certificate (Titre Foncier).',
        accentColor: '#b45309',       // amber-gold — highest authority, "last bus stop"
        // RECEIPTED appears here only for notarial fast-track files —
        // the server scopes the queue so full-track receipts stay with the SDO
        activeStatuses: new Set(['RECEIPTED', 'REGIONAL_REVIEW', 'OPPOSITION_WINDOW', 'CLEARED']),
        contextStatuses: new Set(['TITLE_ISSUED']),
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
  TRANSFORMATION: 'Transformation',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  RECEIPTED: 'Receipted',
  PUBLISHED: 'Public Notice',
  BOARD_SCHEDULED: 'Board Scheduled',
  SURVEYED: 'Surveyed',
  REGIONAL_REVIEW: 'Regional Review',
  OPPOSITION_WINDOW: 'Opposition Window',
  CLEARED: 'Cleared',
  TITLE_ISSUED: 'Title Issued',
  QUERIED: 'Queried',
  REJECTED: 'Rejected',
};

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

function statusColor(status: string): ChipColor {
  switch (status) {
    case 'SUBMITTED': return 'info';
    case 'RECEIPTED': return 'primary';
    case 'PUBLISHED': return 'warning';
    case 'SURVEYED': return 'secondary';
    case 'REGIONAL_REVIEW': return 'info';
    case 'OPPOSITION_WINDOW': return 'warning';
    case 'CLEARED': return 'primary';
    case 'TITLE_ISSUED': return 'success';
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

  return (
    <Box>
      {/* Role identity banner */}
      <Box
        sx={{
          bgcolor: config.accentColor,
          color: 'white',
          px: 4,
          py: 3,
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontFamily: '"Lora", serif', fontWeight: 700, mb: 0.5 }}
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

      <Box sx={{ p: 4 }}>
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
