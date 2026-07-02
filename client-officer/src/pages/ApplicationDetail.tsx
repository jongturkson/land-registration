import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';
import { getUser } from '../lib/auth';

// ── Types ──────────────────────────────────────────────────────────────────

interface Dispute {
  id: string;
  opponent_name: string;
  opponent_contact: string | null;
  grounds: string;
  status: 'ACTIVE' | 'RESOLVED' | 'WITHDRAWN';
  resolution_notes: string | null;
  filed_at: string;
  resolved_at: string | null;
}

interface AppDocument {
  id: string;
  doc_type: string;
  original_name: string | null;
  verified_flag: boolean;
}

interface TitleSummary {
  id: string;
  title_no: string;
  certificate_pdf_path: string | null;
}

interface ParcelFull {
  plot_no: string | null;
  block_no: string | null;
  division: string;
  sub_division: string | null;
  situation: string | null;
  area_sqm: string | null;
  nature: string | null;
  limit_north: string | null;
  limit_south: string | null;
  limit_east: string | null;
  limit_west: string | null;
  developments: string | null;
  dev_value: number | null;
  others_occupy: boolean | null;
  titles: TitleSummary[];
}

interface ApplicationFull {
  id: string;
  type: string;
  status: string;
  reference_no: string | null;
  created_at: string;
  updated_at: string;
  applicant_father: string | null;
  applicant_mother: string | null;
  applicant_nationality: string | null;
  applicant_birth_place: string | null;
  applicant_birth_date: string | null;
  applicant_profession: string | null;
  marital_status: string | null;
  matrimonial_regime: string | null;
  applicant: {
    full_name: string;
    email: string | null;
    region: string;
  };
  documents: AppDocument[];
  disputes: Dispute[];
  parcel: ParcelFull | null;
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

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'National ID Card',
  SITE_PLAN: 'Preliminary Site Plan',
  ATTESTATION: 'Attestation of Ownership',
  PROCES_VERBAL: 'Procès-Verbal de Bornage',
  CADASTRAL_PLAN: 'Cadastral Plan',
  OTHER: 'Other Supporting Document',
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

// ── Role accent colours (mirrors DashboardPage) ────────────────────────────

function roleAccent(role: string): string {
  switch (role) {
    case 'sub_divisional_officer': return '#5c35b5';
    case 'divisional_delegate': return '#0277bd';
    case 'registrar': return '#b45309';
    default: return '#1976d2';
  }
}

// ── Sub-component ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.25 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const user = getUser();
  const accent = roleAccent(user?.role ?? '');

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    body: string;
    new_status: string;
    decision: string;
    action: 'transition' | 'regional-approve' | 'issue-title';
  }>({ open: false, title: '', body: '', new_status: '', decision: '', action: 'transition' });

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [queryOpen, setQueryOpen] = useState(false);
  const [queryNote, setQueryNote] = useState('');
  const [resolveFor, setResolveFor] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState<'RESOLVED' | 'WITHDRAWN'>('RESOLVED');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Inline document preview (officers can view before deciding to download)
  const [preview, setPreview] = useState<{
    open: boolean;
    url: string | null;
    name: string;
    mime: string;
    loading: boolean;
  }>({ open: false, url: null, name: '', mime: '', loading: false });

  const { data: application, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get<ApplicationFull>(`/applications/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const transitionMutation = useMutation({
    mutationFn: (payload: { new_status: string; decision: string }) =>
      api.post(`/applications/${id}/transition`, payload).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
      setRejectOpen(false);
      setQueryOpen(false);
      setRejectionNote('');
      setQueryNote('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Action failed. Please try again.')
        : 'An unexpected error occurred.';
      setActionError(msg);
    },
  });

  // Regional Review step publishes a Public Bulletin notice as a side effect —
  // routed through its own endpoint rather than the generic transition.
  const regionalApproveMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/regional-approve`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Action failed. Please try again.')
        : 'An unexpected error occurred.';
      setActionError(msg);
    },
  });

  // Final statutory act — issues the Land Certificate via its own dedicated endpoint
  // (rather than the generic transition) since it triggers PDF generation server-side.
  const issueTitleMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/issue-title`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setConfirmDialog((d) => ({ ...d, open: false }));
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Action failed. Please try again.')
        : 'An unexpected error occurred.';
      setActionError(msg);
    },
  });

  // Mainlevée — lifts an opposition so the title can be issued
  const resolveDisputeMutation = useMutation({
    mutationFn: (disputeId: string) =>
      api
        .post(`/disputes/${disputeId}/resolve`, {
          resolution_notes: resolutionNotes.trim(),
          outcome: resolutionOutcome,
        })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      setResolveFor(null);
      setResolutionNotes('');
      setResolutionOutcome('RESOLVED');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Action failed. Please try again.')
        : 'An unexpected error occurred.';
      setActionError(msg);
    },
  });

  async function handlePreview(docId: string, label: string) {
    setDownloadError(null);
    setPreview({ open: true, url: null, name: label, mime: '', loading: true });
    try {
      const res = await api.get(`/applications/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      setPreview({ open: true, url, name: label, mime: blob.type, loading: false });
    } catch {
      setPreview({ open: false, url: null, name: '', mime: '', loading: false });
      setDownloadError('Failed to load document preview. Please try again.');
    }
  }

  function closePreview() {
    setPreview((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
      return { open: false, url: null, name: '', mime: '', loading: false };
    });
  }

  async function handleDownload(docId: string, docType: string) {
    setDownloadError(null);
    try {
      const res = await api.get(`/applications/documents/${docId}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${application?.reference_no ?? 'doc'}-${docType.toLowerCase()}`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Failed to download document. Please try again.');
    }
  }

  async function handleDownloadCertificate(titleId: string, titleNo: string) {
    setDownloadError(null);
    try {
      const res = await api.get(`/titles/${titleId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${titleNo}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Failed to download certificate. Please try again.');
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !application) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Application not found or failed to load.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </Box>
    );
  }

  const status = application.status;
  const isPending =
    transitionMutation.isPending || regionalApproveMutation.isPending || issueTitleMutation.isPending;
  const latestTitle = application.parcel?.titles?.[0];
  const activeDisputes = application.disputes.filter((d) => d.status === 'ACTIVE');

  // ── Role-specific action bar ─────────────────────────────────────────────

  function openConfirm(
    title: string,
    body: string,
    new_status: string,
    decision: string,
    action: 'transition' | 'regional-approve' | 'issue-title' = 'transition',
  ) {
    setConfirmDialog({ open: true, title, body, new_status, decision, action });
  }

  function ActionBar() {
    const role = user?.role;

    // ── SDO: receives submissions and publishes for public notice ────────
    if (role === 'sub_divisional_officer') {
      if (status === 'SUBMITTED') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#4a28a0' } }}
              onClick={() =>
                openConfirm(
                  'Issue Official Receipt?',
                  'This will acknowledge the application and issue the Récépissé. The file will move to the Receipted stage, opening the formal registration process.',
                  'RECEIPTED',
                  'Application received and récépissé issued. File opened.',
                )
              }
            >
              Issue Récépissé
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending}
              onClick={() => setRejectOpen(true)}
            >
              Reject Application
            </Button>
          </Box>
        );
      }
      if (status === 'RECEIPTED') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#4a28a0' } }}
              onClick={() =>
                openConfirm(
                  'Order Public Notice?',
                  'This will post an extract of the application at the SDO office, the council, and the village chiefdom — the statutory public notice required under Decree 76/165. The application moves to Public Notice status and the surveyor\'s commission will be convened.',
                  'PUBLISHED',
                  'Public notice ordered. Extract posted at SDO office, council, and chiefdom.',
                )
              }
            >
              Order Public Notice
            </Button>
            <Button
              variant="outlined"
              disabled={isPending}
              onClick={() => setQueryOpen(true)}
            >
              Raise a Query
            </Button>
          </Box>
        );
      }
    }

    // ── Divisional Delegate: assembles dossier, forwards to region ───────
    if (role === 'divisional_delegate') {
      if (status === 'SURVEYED') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#01579b' } }}
              onClick={() =>
                openConfirm(
                  'Forward to Regional Delegation?',
                  'You have verified the dossier is complete: application, commission PV, Procès-Verbal de Bornage, and 5 copies of the boundary plan. Forwarding this file transmits it to the Regional Delegate for registration in the regional register and publication of the avis de clôture de bornage.',
                  'REGIONAL_REVIEW',
                  'Dossier verified complete. Transmitted to Regional Delegation for regional registration and avis de clôture.',
                )
              }
            >
              Forward to Regional Delegation
            </Button>
            <Button
              variant="outlined"
              disabled={isPending}
              onClick={() => setQueryOpen(true)}
            >
              Return for Correction
            </Button>
          </Box>
        );
      }
    }

    // ── Registrar (Conservateur Foncier): opposition management & title ──
    if (role === 'registrar') {
      if (status === 'REGIONAL_REVIEW') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
              onClick={() =>
                openConfirm(
                  'Open the 30-Day Opposition Window?',
                  'Opening the opposition window publishes the avis de clôture de bornage to the Public Digital Bulletin. Any interested party then has 30 days to file a stamped opposition or demand inscription of a real right. You will log any opposition received before issuing the title.',
                  'OPPOSITION_WINDOW',
                  'File examined. Regularity confirmed. Avis de clôture de bornage published. Opposition window opened.',
                  'regional-approve',
                )
              }
            >
              Open Opposition Window
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending}
              onClick={() => setRejectOpen(true)}
            >
              Reject File
            </Button>
          </Box>
        );
      }
      if (status === 'OPPOSITION_WINDOW') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
              onClick={() =>
                openConfirm(
                  'Clear File for Title Issuance?',
                  'The 30-day opposition window has closed with no unresolved opposition (mainlevée confirmed for any that were filed). Clearing this file authorises you to enter the parcel in the Livre Foncier and issue the Land Certificate.',
                  'CLEARED',
                  '30-day opposition window closed. No valid, unresolved oppositions. File cleared for immatriculation.',
                )
              }
            >
              Close Window — Clear for Title
            </Button>
            <Button
              variant="outlined"
              disabled={isPending}
              onClick={() => setQueryOpen(true)}
            >
              Log an Opposition
            </Button>
          </Box>
        );
      }
      if (status === 'CLEARED') {
        // Legal blocker: active oppositions freeze title issuance (mainlevée required)
        const blocked = activeDisputes.length > 0;
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="contained"
              disabled={isPending || blocked}
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              onClick={() =>
                openConfirm(
                  'Issue Land Certificate (Titre Foncier)?',
                  'This is the final statutory act. You will enter the parcel in the Livre Foncier and issue the Copie du Titre Foncier. The certificate is inattaquable, intangible et définitif — unassailable, indefeasible and final — and enforceable against all third parties. This action cannot be undone through this system.',
                  '',
                  '',
                  'issue-title',
                )
              }
            >
              Issue Land Certificate
            </Button>
            {blocked && (
              <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
                {t('disputes.issueBlocked')}
              </Typography>
            )}
          </Box>
        );
      }
      if (status === 'TITLE_ISSUED' && latestTitle?.certificate_pdf_path) {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
              onClick={() => void handleDownloadCertificate(latestTitle.id, latestTitle.title_no)}
            >
              Download Title Certificate
            </Button>
          </Box>
        );
      }
    }

    return null;
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Box>
      {/* Role-coloured header strip */}
      <Box sx={{ bgcolor: accent, color: 'white', px: 4, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            sx={{ color: 'white', opacity: 0.85, minWidth: 0 }}
            onClick={() => navigate('/dashboard')}
          >
            ← Back
          </Button>
          <Typography
            variant="h6"
            component="h1"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700, flexGrow: 1 }}
          >
            {application.reference_no ?? '(draft)'} — Application Review
          </Typography>
          <Chip
            label={STATUS_LABELS[status] ?? status}
            color={statusColor(status)}
            sx={{ fontWeight: 700 }}
          />
        </Box>
      </Box>

      <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {/* Application details */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardHeader
            title="Application Details"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <InfoRow label="Reference No." value={application.reference_no ?? '—'} />
              <InfoRow label="Type" value={TYPE_LABELS[application.type] ?? application.type} />
              <InfoRow
                label="Current Status"
                value={STATUS_LABELS[status] ?? status}
              />
              <InfoRow
                label="Date Filed"
                value={new Date(application.created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Applicant details + civil status (État civil du propriétaire) */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardHeader
            title="Applicant — Civil Status (État civil du propriétaire)"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
              <InfoRow label="Full Name" value={application.applicant.full_name} />
              <InfoRow label="Email" value={application.applicant.email ?? '—'} />
              <InfoRow label="Region" value={application.applicant.region} />
              <InfoRow label="Nationality" value={application.applicant_nationality ?? '—'} />
              <InfoRow label="Profession" value={application.applicant_profession ?? '—'} />
              <InfoRow
                label="Father's Name (Fils/Fille de)"
                value={application.applicant_father ?? '—'}
              />
              <InfoRow label="Mother's Name (et de)" value={application.applicant_mother ?? '—'} />
              <InfoRow
                label="Place of Birth"
                value={application.applicant_birth_place ?? '—'}
              />
              <InfoRow
                label="Date of Birth"
                value={
                  application.applicant_birth_date
                    ? new Date(application.applicant_birth_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : '—'
                }
              />
              <InfoRow label="Marital Status" value={application.marital_status ?? '—'} />
              <InfoRow label="Matrimonial Regime" value={application.matrimonial_regime ?? '—'} />
            </Box>
          </CardContent>
        </Card>

        {/* Land / parcel description (Désignation de l'immeuble) */}
        {application.parcel && (
          <Card elevation={1} sx={{ mb: 2 }}>
            <CardHeader
              title="Land Description (Désignation de l'immeuble)"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <InfoRow label="Division" value={application.parcel.division} />
                <InfoRow label="Sub-Division" value={application.parcel.sub_division ?? '—'} />
                <InfoRow label="Plot No." value={application.parcel.plot_no ?? '—'} />
                <InfoRow label="Block No." value={application.parcel.block_no ?? '—'} />
                <InfoRow label="Locality (Lieu-dit)" value={application.parcel.situation ?? '—'} />
                <InfoRow
                  label="Area"
                  value={application.parcel.area_sqm ? `${application.parcel.area_sqm} m²` : '—'}
                />
                <InfoRow
                  label="Nature & Consistency"
                  value={application.parcel.nature ?? '—'}
                />
                <InfoRow
                  label="Existing Developments"
                  value={application.parcel.developments ?? '—'}
                />
                <InfoRow
                  label="Approx. Value of Developments"
                  value={
                    application.parcel.dev_value != null
                      ? `${application.parcel.dev_value.toLocaleString()} FCFA`
                      : '—'
                  }
                />
                <InfoRow
                  label="Occupied by Others?"
                  value={
                    application.parcel.others_occupy == null
                      ? '—'
                      : application.parcel.others_occupy
                        ? 'Yes'
                        : 'No'
                  }
                />
                <InfoRow label="Boundary — North" value={application.parcel.limit_north ?? '—'} />
                <InfoRow label="Boundary — South" value={application.parcel.limit_south ?? '—'} />
                <InfoRow label="Boundary — East" value={application.parcel.limit_east ?? '—'} />
                <InfoRow label="Boundary — West" value={application.parcel.limit_west ?? '—'} />
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Document vault */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardHeader
            title="Document Vault"
            subheader="All documents submitted by the applicant and surveyor"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <Divider />
          <CardContent>
            {downloadError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDownloadError(null)}>
                {downloadError}
              </Alert>
            )}
            {application.documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No documents uploaded.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {application.documents.map((doc) => (
                  <Box
                    key={doc.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0, pr: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                      </Typography>
                      {doc.original_name && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                          {doc.original_name}
                        </Typography>
                      )}
                      {doc.verified_flag && (
                        <Typography variant="caption" color="success.main">
                          Verified
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                          void handlePreview(
                            doc.id,
                            doc.original_name ?? DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type,
                          )
                        }
                      >
                        View
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => void handleDownload(doc.id, doc.doc_type)}
                      >
                        Download
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Oppositions / disputes filed during the 30-day window */}
        <Card elevation={1} sx={{ mb: 3 }}>
          <CardHeader
            title={t('disputes.cardTitle')}
            subheader={t('disputes.cardSubtitle')}
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <Divider />
          <CardContent>
            {activeDisputes.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2, fontWeight: 600 }}>
                {t('disputes.activeWarning', { count: activeDisputes.length })}
              </Alert>
            )}
            {application.disputes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('disputes.none')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {application.disputes.map((dispute) => (
                  <Box
                    key={dispute.id}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: dispute.status === 'ACTIVE' ? 'error.light' : 'divider',
                      borderRadius: 1,
                      bgcolor: dispute.status === 'ACTIVE' ? '#fff5f5' : 'transparent',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {t('disputes.filedBy')}: {dispute.opponent_name}
                        {dispute.opponent_contact ? ` · ${dispute.opponent_contact}` : ''}
                      </Typography>
                      <Chip
                        size="small"
                        label={dispute.status}
                        color={dispute.status === 'ACTIVE' ? 'error' : 'success'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>{t('disputes.grounds')}:</strong> {dispute.grounds}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {t('disputes.filedAt')}{' '}
                      {new Date(dispute.filed_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                      {dispute.resolved_at &&
                        ` · ${t('disputes.resolvedAt')} ${new Date(dispute.resolved_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                    </Typography>
                    {dispute.resolution_notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {t('disputes.resolutionNotes')}: {dispute.resolution_notes}
                      </Typography>
                    )}
                    {dispute.status === 'ACTIVE' && user?.role === 'registrar' && (
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        sx={{ mt: 1.5 }}
                        onClick={() => setResolveFor(dispute)}
                      >
                        {t('disputes.resolveBtn')}
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Role-specific action bar */}
        <Card
          elevation={0}
          variant="outlined"
          sx={{ borderColor: accent, borderWidth: 2, mb: 2 }}
        >
          <CardHeader
            title="Your Action"
            subheader="Actions available to you at this stage of the process"
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700, color: accent }}
          />
          <Divider />
          <CardContent>
            {(status === 'TITLE_ISSUED' ||
              status === 'DRAFT' ||
              status === 'PUBLISHED' ||
              status === 'BOARD_SCHEDULED') &&
            !['sub_divisional_officer', 'divisional_delegate', 'registrar'].includes(
              user?.role ?? '',
            ) ? null : <ActionBar />}
            {/* Show a neutral message when no action is available at this stage */}
            {ActionBar() === null && (
              <Alert severity="info" icon={false}>
                {status === 'TITLE_ISSUED'
                  ? 'A Land Certificate has been issued for this application. The registration is complete.'
                  : status === 'REJECTED'
                  ? 'This application has been rejected. No further action is available.'
                  : 'This application is at a stage handled by a different officer. No action is required from you right now.'}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Inline document preview (image / PDF) */}
      <Dialog open={preview.open} onClose={closePreview} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 2 }}>
            {preview.name}
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, bgcolor: '#f5f5f5' }}>
          {preview.loading || !preview.url ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : preview.mime.startsWith('image/') ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Box
                component="img"
                src={preview.url}
                alt={preview.name}
                sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </Box>
          ) : preview.mime === 'application/pdf' ? (
            <Box component="iframe" title={preview.name} src={preview.url} sx={{ width: '100%', height: '70vh', border: 'none' }} />
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                This file type cannot be previewed in the browser. Use Download to open it.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {preview.url && (
            <Button component="a" href={preview.url} download={preview.name} variant="outlined">
              Download
            </Button>
          )}
          <Button onClick={closePreview} variant="contained" sx={{ bgcolor: accent }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generic confirmation dialog (for all non-rejection/query transitions) */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isPending}
            sx={{ bgcolor: accent }}
            onClick={() =>
              confirmDialog.action === 'regional-approve'
                ? regionalApproveMutation.mutate()
                : confirmDialog.action === 'issue-title'
                ? issueTitleMutation.mutate()
                : transitionMutation.mutate({
                    new_status: confirmDialog.new_status,
                    decision: confirmDialog.decision,
                  })
            }
          >
            {isPending ? 'Processing…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onClose={() => { setRejectOpen(false); setRejectionNote(''); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject Application</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Provide a clear reason for rejection. This will be recorded in the workflow audit trail
            and communicated to the applicant.
          </DialogContentText>
          <TextField
            autoFocus
            label="Reason for rejection"
            multiline
            rows={3}
            fullWidth
            value={rejectionNote}
            onChange={(e) => setRejectionNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setRejectOpen(false); setRejectionNote(''); }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={isPending || !rejectionNote.trim()}
            onClick={() =>
              transitionMutation.mutate({
                new_status: 'REJECTED',
                decision: rejectionNote.trim(),
              })
            }
          >
            {isPending ? 'Rejecting…' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve dispute (mainlevée) dialog */}
      <Dialog
        open={!!resolveFor}
        onClose={() => { setResolveFor(null); setResolutionNotes(''); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('disputes.resolveDialog.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('disputes.resolveDialog.body')}</DialogContentText>
          <TextField
            select
            fullWidth
            label={t('disputes.resolveDialog.outcome')}
            value={resolutionOutcome}
            onChange={(e) => setResolutionOutcome(e.target.value as 'RESOLVED' | 'WITHDRAWN')}
            sx={{ mb: 2 }}
          >
            <MenuItem value="RESOLVED">{t('disputes.resolveDialog.resolved')}</MenuItem>
            <MenuItem value="WITHDRAWN">{t('disputes.resolveDialog.withdrawn')}</MenuItem>
          </TextField>
          <TextField
            autoFocus
            label={t('disputes.resolveDialog.notes')}
            multiline
            rows={3}
            fullWidth
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setResolveFor(null); setResolutionNotes(''); }}
            disabled={resolveDisputeMutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={resolveDisputeMutation.isPending || resolutionNotes.trim().length < 5}
            onClick={() => resolveFor && resolveDisputeMutation.mutate(resolveFor.id)}
          >
            {resolveDisputeMutation.isPending
              ? t('common.processing')
              : t('disputes.resolveDialog.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Query / return-for-correction dialog */}
      <Dialog
        open={queryOpen}
        onClose={() => { setQueryOpen(false); setQueryNote(''); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {user?.role === 'registrar' ? 'Log Opposition' : 'Raise a Query / Return for Correction'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {user?.role === 'registrar'
              ? 'Record the opposition details. The file cannot proceed to title issuance until the opposition is lifted (mainlevée).'
              : 'Describe the issue that requires correction. The file will be queried and the applicant / lower office will be notified.'}
          </DialogContentText>
          <TextField
            autoFocus
            label={user?.role === 'registrar' ? 'Opposition details' : 'Query / correction required'}
            multiline
            rows={3}
            fullWidth
            value={queryNote}
            onChange={(e) => setQueryNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setQueryOpen(false); setQueryNote(''); }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={isPending || !queryNote.trim()}
            onClick={() =>
              transitionMutation.mutate({
                new_status: 'QUERIED',
                decision: queryNote.trim(),
              })
            }
          >
            {isPending ? 'Saving…' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
