import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  Paper,
  Typography,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApprovalEntry {
  step: string;
  decision: string;
  role: string;
  signed_at: string;
}

interface MyApplication {
  id: string;
  type: string;
  status: string;
  reference_no: string | null;
  created_at: string;
  updated_at: string;
  source_title_no: string | null;
  approvals: ApprovalEntry[];
  issued_title: { id: string; title_no: string; has_certificate: boolean } | null;
}

// Type and status labels live in i18n under track.types.* and myApps.statuses.*

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

function statusColor(status: string): ChipColor {
  switch (status) {
    case 'TITLE_ISSUED':
    case 'COMPLETED':
      return 'success';
    case 'QUERIED':
      return 'warning';
    case 'REJECTED':
      return 'error';
    case 'DRAFT':
      return 'default';
    default:
      return 'primary';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MyApplications() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('fr') ? 'fr-FR' : 'en-GB';
  const [openId, setOpenId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.get<MyApplication[]>('/applications/mine').then((r) => r.data),
  });

  async function handleDownloadCertificate(app: MyApplication) {
    if (!app.issued_title) return;
    setDownloadError(null);
    try {
      const res = await api.get(`/applications/${app.id}/certificate`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${app.issued_title.title_no}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(t('myApps.downloadError'));
    }
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 }, px: { xs: 2, sm: 3 } }}>
      <Typography variant="overline" color="text.secondary">
        {t('myApps.overline')}
      </Typography>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: "'Lora', serif", fontWeight: 700, fontSize: { xs: '1.7rem', md: '2.1rem' } }}
      >
        {t('myApps.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {t('myApps.subtitle')}
      </Typography>

      {isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('myApps.loadError')}
        </Alert>
      )}
      {downloadError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setDownloadError(null)}>
          {downloadError}
        </Alert>
      )}

      {applications && applications.length === 0 && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t('myApps.empty')}
          </Typography>
          <Button component={Link} to="/apply" variant="contained">
            {t('myApps.emptyCta')}
          </Button>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {applications?.map((app) => {
          const open = openId === app.id;
          // The most recent query/rejection note, surfaced prominently
          const attention =
            app.status === 'QUERIED' || app.status === 'REJECTED'
              ? [...app.approvals]
                  .reverse()
                  .find((a) => a.step === 'Query Raised' || a.step === 'Rejection')
              : undefined;

          return (
            <Paper key={app.id} elevation={1} sx={{ p: 2.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {app.reference_no ?? t('myApps.draftRef')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t(`track.types.${app.type}`, { defaultValue: app.type })}
                    {app.source_title_no
                      ? ` · ${t('myApps.onTitle', { titleNo: app.source_title_no })}`
                      : ''}{' '}
                    · {t('myApps.filed', { date: formatDate(app.created_at) })}
                  </Typography>
                </Box>
                <Chip
                  label={t(`myApps.statuses.${app.status}`, { defaultValue: app.status })}
                  color={statusColor(app.status)}
                  sx={{ fontWeight: 700 }}
                />
                {app.reference_no && (
                  <Button
                    size="small"
                    variant="text"
                    component={Link}
                    to={`/track?ref=${encodeURIComponent(app.reference_no)}`}
                    startIcon={<SearchIcon />}
                  >
                    {t('myApps.trackBtn')}
                  </Button>
                )}
                <IconButton size="small" onClick={() => setOpenId(open ? null : app.id)}>
                  {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              {/* Query / rejection reason — visible without expanding */}
              {attention && (
                <Alert
                  severity={app.status === 'REJECTED' ? 'error' : 'warning'}
                  sx={{ mt: 1.5 }}
                >
                  <strong>
                    {app.status === 'REJECTED'
                      ? t('myApps.rejectionReason')
                      : t('myApps.correctionNeeded')}
                  </strong>{' '}
                  {attention.decision}
                </Alert>
              )}

              {/* Issued certificate */}
              {app.issued_title && (
                <Alert severity="success" sx={{ mt: 1.5 }}
                  action={
                    app.issued_title.has_certificate ? (
                      <Button
                        color="inherit"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => void handleDownloadCertificate(app)}
                      >
                        {t('myApps.downloadCert')}
                      </Button>
                    ) : undefined
                  }
                >
                  {t('myApps.certIssued', { titleNo: app.issued_title.title_no })}
                </Alert>
              )}

              {/* Full decision history */}
              <Collapse in={open}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  {t('myApps.historyTitle')}
                </Typography>
                {app.approvals.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('myApps.noSteps')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {app.approvals.map((a, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: "'IBM Plex Mono', monospace", color: 'text.secondary', minWidth: 90 }}
                        >
                          {formatDate(a.signed_at)}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 160 }}>
                          {a.step}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
                          {a.decision}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </Collapse>
            </Paper>
          );
        })}
      </Box>
    </Container>
  );
}
