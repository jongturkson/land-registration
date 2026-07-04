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
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';
import { getUser } from '../lib/auth';
import { trackFor, stepsFor, nextStepText } from '../lib/workflow';

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

interface SourceTitle {
  id: string;
  title_no: string;
  volume: string | null;
  folio: string | null;
  status: string;
  division: string;
  area_sqm: string | null;
  owners: { full_name: string }[];
  encumbrances: { id: string; kind: string; party: string | null; recorded_at: string }[];
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
  mortgage_creditor: string | null;
  mortgage_amount: number | null;
  applicant: {
    full_name: string;
    email: string | null;
    region: string;
  };
  documents: AppDocument[];
  disputes: Dispute[];
  parcel: ParcelFull | null;
  source_title: SourceTitle | null;
}

// ── Lookup tables ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration',
  PARTIAL_ALIENATION: 'Partial Alienation',
  TOTAL_ALIENATION: 'Total Alienation',
  STATE_LAND: 'State Land',
  PARTITION: 'Partition',
  MORTGAGE: 'Mortgage',
  MORTGAGE_RELEASE: 'Mortgage Release (Mainlevée)',
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

const DOC_TYPE_LABELS: Record<string, string> = {
  ID_CARD: 'National ID Card',
  SITE_PLAN: 'Preliminary Site Plan',
  ATTESTATION: 'Attestation of Ownership',
  JUDGMENT: 'Court Judgment / Inheritance Certificate',
  NOTARIAL_ACT: 'Notarial Act (Acte Notarié)',
  RELEASE_DEED: "Creditor's Release Deed (Mainlevée Notariée)",
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
    action: 'transition' | 'regional-approve' | 'issue-title' | 'execute';
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

  // Registrar-direct finalisation — mutation totale / hypothèque / mainlevée
  // executed on the EXISTING title through its own endpoint (never issues a
  // new title)
  const executeMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/execute`, {}).then((r) => r.data),
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
    transitionMutation.isPending ||
    regionalApproveMutation.isPending ||
    issueTitleMutation.isPending ||
    executeMutation.isPending;
  const latestTitle = application.parcel?.titles?.[0];
  const activeDisputes = application.disputes.filter((d) => d.status === 'ACTIVE');
  const activeEncumbrances = application.source_title?.encumbrances ?? [];
  // Narrowed copies for use inside the nested ActionBar closure
  const appType = application.type;
  const sourceTitleNo = application.source_title?.title_no;
  const mortgageCreditor = application.mortgage_creditor;

  // Statutory track for this application type (mirrors the server state machine)
  const track = trackFor(application.type);
  const workflowSteps = stepsFor(application.type);
  const currentStepIndex = workflowSteps.findIndex((s) => s.status === status);

  // ── Role-specific action bar ─────────────────────────────────────────────

  function openConfirm(
    title: string,
    body: string,
    new_status: string,
    decision: string,
    action: 'transition' | 'regional-approve' | 'issue-title' | 'execute' = 'transition',
  ) {
    setConfirmDialog({ open: true, title, body, new_status, decision, action });
  }

  function ActionBar() {
    const role = user?.role;

    // ── SDO: receives submissions and publishes for public notice ────────
    // Only first registrations pass through the SDO desk — registrar-led
    // tracks (alienations, partition, mortgage, release) never appear here.
    if (role === 'sub_divisional_officer' && track === 'FULL') {
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
      if (status === 'QUERIED') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#4a28a0' } }}
              onClick={() =>
                openConfirm(
                  'Re-open File?',
                  'The queried issue has been corrected. The file returns to the Receipted stage and resumes its normal course.',
                  'RECEIPTED',
                  'Query resolved. File re-opened at receipt stage.',
                )
              }
            >
              Re-open File (Query Resolved)
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

    // ── Registrar (Conservateur Foncier): registrar-led tracks & title ────
    if (role === 'registrar') {
      // Carve-out (morcellement): verify the deed + mother title, then
      // commission the survey that will detach the child parcel.
      if (status === 'SUBMITTED' && track === 'CARVE_OUT') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
              onClick={() =>
                openConfirm(
                  'Verify Deed — Commission Carve-out Survey?',
                  'You confirm the notarial act / partition judgment is authentic and the mother title is VALID in the register. Commissioning the survey sends the file to the sworn surveyor, who must demarcate the child parcel entirely inside the mother boundary.',
                  'SURVEY_ORDERED',
                  'Deed and mother title verified. Carve-out survey commissioned.',
                )
              }
            >
              Verify Deed — Order Carve-out Survey
            </Button>
            <Button
              variant="outlined"
              disabled={isPending}
              onClick={() => setQueryOpen(true)}
            >
              Raise a Query
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

      // Registrar-direct (mutation totale / hypothèque / mainlevée): verify
      // the deed against the title, then clear for execution.
      if (status === 'SUBMITTED' && track === 'DIRECT') {
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {appType === 'TOTAL_ALIENATION' && activeEncumbrances.length > 0 && (
              <Alert severity="warning">
                This title carries {activeEncumbrances.length} active encumbrance(s)
                {activeEncumbrances[0]?.party ? ` (e.g. ${activeEncumbrances[0].party})` : ''}.
                The transfer is not blocked, but the charge follows the land — the acquirer
                takes the parcel subject to it.
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disabled={isPending}
                sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
                onClick={() =>
                  openConfirm(
                    'Verify Deed — Clear for Registration?',
                    'You confirm the notarial deed is authentic, the duties are paid, and it matches the title in the register. This type bypasses the public phases entirely; once cleared, you will execute the entry on the existing title.',
                    'CLEARED',
                    'Notarial deed verified against the title. Duties confirmed paid. File cleared for execution.',
                  )
                }
              >
                Verify Deed — Clear for Registration
              </Button>
              <Button
                variant="outlined"
                disabled={isPending}
                onClick={() => setQueryOpen(true)}
              >
                Raise a Query
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
          </Box>
        );
      }

      // Carve-out survey returned — validate it and clear for the child title
      if (status === 'SURVEYED' && track === 'CARVE_OUT') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
              onClick={() =>
                openConfirm(
                  'Approve Survey — Clear for Child Title?',
                  'The Procès-Verbal de Bornage is on file and the child polygon was validated inside the mother boundary. Clearing the file authorises issuance of the child title and the corresponding reduction of the mother parcel.',
                  'CLEARED',
                  'Carve-out survey approved. File cleared for issuance of the child title.',
                )
              }
            >
              Approve Survey — Clear for Child Title
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

      // Queried registrar-led file: after correction, re-open on your desk
      if (status === 'QUERIED' && track !== 'FULL') {
        return (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              disabled={isPending}
              sx={{ bgcolor: accent, '&:hover': { bgcolor: '#92400e' } }}
              onClick={() =>
                openConfirm(
                  'Re-open File?',
                  'The queried issue has been corrected. The file returns to your desk at the verification stage.',
                  'SUBMITTED',
                  'Query resolved. File re-opened on the Conservateur Foncier’s desk.',
                )
              }
            >
              Re-open File (Query Resolved)
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
        // Registrar-direct: execute the entry on the EXISTING title
        if (track === 'DIRECT') {
          const executeLabel =
            appType === 'TOTAL_ALIENATION'
              ? 'Execute Transfer (Mutation Totale)'
              : appType === 'MORTGAGE'
                ? 'Inscribe Mortgage (Hypothèque)'
                : 'Release Mortgage (Mainlevée)';
          const executeBody =
            appType === 'TOTAL_ALIENATION'
              ? `The current owner of ${sourceTitleNo ?? 'the title'} will be retired and the applicant recorded as the new owner. The title number, volume and folio are unchanged. Any active encumbrance follows the land.`
              : appType === 'MORTGAGE'
                ? `An ACTIVE mortgage in favour of ${mortgageCreditor ?? 'the creditor'} will be inscribed on ${sourceTitleNo ?? 'the title'} and appended to the ledger.`
                : `The active mortgage${mortgageCreditor ? ` held by ${mortgageCreditor}` : ''} on ${sourceTitleNo ?? 'the title'} will be cleared (mainlevée) and the release appended to the ledger.`;
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {appType === 'TOTAL_ALIENATION' && activeEncumbrances.length > 0 && (
                <Alert severity="warning">
                  {activeEncumbrances.length} active encumbrance(s) will carry over to the new
                  owner with the land.
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  disabled={isPending}
                  sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                  onClick={() =>
                    openConfirm(`${executeLabel}?`, executeBody, '', '', 'execute')
                  }
                >
                  {executeLabel}
                </Button>
              </Box>
            </Box>
          );
        }

        // Carve-out: issue the child title and reduce the mother parcel
        if (track === 'CARVE_OUT') {
          return (
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                disabled={isPending}
                sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
                onClick={() =>
                  openConfirm(
                    'Issue Child Title — Reduce Mother Parcel?',
                    `This is the final statutory act of the morcellement. A new title is created for the carved-out parcel in the applicant's name, and mother title ${sourceTitleNo ?? ''} keeps its number with its geometry and area reduced by the detached portion. Both sides of the mutation are appended to the ledger.`,
                    '',
                    '',
                    'issue-title',
                  )
                }
              >
                Issue Child Title
              </Button>
            </Box>
          );
        }

        // Full track: immatriculation — active oppositions freeze issuance
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

        {/* Statutory progress — the two grand phases of the physical journey */}
        <Card elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                {track === 'DIRECT'
                  ? 'REGISTRAR-DIRECT — LIVRE FONCIER ENTRY ON THE EXISTING TITLE'
                  : track === 'CARVE_OUT'
                    ? 'REGISTRAR-LED CARVE-OUT (MORCELLEMENT)'
                    : 'PHASE I — ESTABLISHING THE GROUND TRUTH · PHASE II — REGISTRATION'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {track === 'FULL'
                  ? 'First registration — 30-day opposition window applies'
                  : track === 'CARVE_OUT'
                    ? 'Titled mother parcel — straight to the Registrar, survey required, no opposition window'
                    : 'Notarial deed — straight to the Registrar, no public phases'}
              </Typography>
            </Box>
            {status === 'QUERIED' || status === 'REJECTED' ? (
              <Alert severity={status === 'REJECTED' ? 'error' : 'warning'} icon={false}>
                {nextStepText(application.type, status)}
              </Alert>
            ) : (
              <>
                <Stepper
                  activeStep={currentStepIndex === -1 ? 0 : currentStepIndex}
                  alternativeLabel
                  sx={{ mb: 1.5 }}
                >
                  {workflowSteps.map((s, i) => (
                    <Step key={s.status} completed={currentStepIndex > i}>
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
                <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                  {nextStepText(application.type, status)}
                </Alert>
              </>
            )}
          </CardContent>
        </Card>

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

        {/* Source (mother) title — the existing title this file operates on */}
        {application.source_title && (
          <Card elevation={1} sx={{ mb: 2, borderLeft: '4px solid #b45309' }}>
            <CardHeader
              title={
                track === 'CARVE_OUT'
                  ? 'Mother Title (Titre Mère)'
                  : 'Source Title (Titre Concerné)'
              }
              subheader="Verified against the Livre Foncier at submission"
              titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
            />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <InfoRow label="Title No." value={application.source_title.title_no} />
                <InfoRow
                  label="Volume / Folio"
                  value={`${application.source_title.volume ?? '—'} / ${application.source_title.folio ?? '—'}`}
                />
                <InfoRow
                  label="Current Owner"
                  value={application.source_title.owners[0]?.full_name ?? '—'}
                />
                <InfoRow label="Registry Status" value={application.source_title.status} />
                <InfoRow label="Division" value={application.source_title.division} />
                <InfoRow
                  label="Registered Area"
                  value={
                    application.source_title.area_sqm
                      ? `${application.source_title.area_sqm} m²`
                      : '—'
                  }
                />
              </Box>
              {(application.type === 'MORTGAGE' || application.type === 'MORTGAGE_RELEASE') && (
                <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  <InfoRow
                    label="Creditor (Bank / Lender)"
                    value={application.mortgage_creditor ?? '—'}
                  />
                  <InfoRow
                    label="Secured Amount"
                    value={
                      application.mortgage_amount != null
                        ? `${application.mortgage_amount.toLocaleString()} FCFA`
                        : '—'
                    }
                  />
                </Box>
              )}
              {activeEncumbrances.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Active encumbrance(s) on this title:{' '}
                  {activeEncumbrances
                    .map((e) => `${e.kind}${e.party ? ` — ${e.party}` : ''}`)
                    .join('; ')}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

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
            {ActionBar() ?? (
              <Alert severity="info" icon={false}>
                {status === 'TITLE_ISSUED'
                  ? 'A Land Certificate has been issued for this application. The registration is complete.'
                  : status === 'COMPLETED'
                  ? 'The registration has been executed on the existing title in the Livre Foncier. The file is complete.'
                  : status === 'SURVEY_ORDERED'
                  ? 'The carve-out survey has been commissioned — awaiting the sworn surveyor’s Procès-Verbal de Bornage.'
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
                : confirmDialog.action === 'execute'
                ? executeMutation.mutate()
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
