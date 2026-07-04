import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';

interface TitleOwner {
  id: string;
  full_name: string;
  is_current: boolean;
}

interface Encumbrance {
  id: string;
  kind: string;
  party: string | null;
  status: string;
}

interface TitleRow {
  id: string;
  title_no: string;
  division: string;
  issued_at: string | null;
  status: string;
  certificate_pdf_path: string | null;
  parcel: {
    id: string;
    division: string;
    sub_division: string | null;
    situation: string | null;
    plot_no: string | null;
    area_sqm: string | null;
  };
  owners: TitleOwner[];
  encumbrances: Encumbrance[];
}

function errorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err)
    ? ((err.response?.data as { message?: string } | undefined)?.message ?? fallback)
    : fallback;
}

// Registry consultation (Livre Foncier). Deliberately read-only: transfers,
// mortgages, releases and subdivisions all arrive as citizen applications and
// are executed through the application workflow — never directly from here.
// The single direct act left is the ministerial cancellation of a title.
export default function TitleManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [cancelFor, setCancelFor] = useState<TitleRow | null>(null);
  const [orderRef, setOrderRef] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );

  const { data: titles, isLoading, isError } = useQuery({
    queryKey: ['titles', 'VALID'],
    queryFn: () => api.get<TitleRow[]>('/titles').then((r) => r.data),
  });

  function closeCancelDialog() {
    setCancelFor(null);
    setOrderRef('');
    setCancelReason('');
    setCancelConfirmed(false);
  }

  const cancelMutation = useMutation({
    mutationFn: (titleNo: string) =>
      api
        .post(`/titles/${titleNo}/cancel`, {
          ministerial_order_ref: orderRef.trim(),
          ...(cancelReason.trim() ? { reason: cancelReason.trim() } : {}),
          confirm: true,
        })
        .then((r) => r.data),
    onSuccess: (_data, titleNo) => {
      void queryClient.invalidateQueries({ queryKey: ['titles'] });
      closeCancelDialog();
      setFeedback({ severity: 'success', text: t('titles.cancelDialog.success', { titleNo }) });
    },
    onError: (err: unknown) =>
      setFeedback({ severity: 'error', text: errorMessage(err, t('common.actionFailed')) }),
  });

  async function handleDownloadCertificate(title: TitleRow) {
    try {
      const res = await api.get(`/titles/${title.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${title.title_no}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setFeedback({ severity: 'error', text: t('common.actionFailed') });
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
        {t('titles.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {t('titles.subtitle')}
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        {t('titles.readOnlyNote')}
      </Alert>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}
      {isError && <Alert severity="error">{t('common.loadFailed')}</Alert>}

      {titles && titles.length === 0 && <Alert severity="info">{t('titles.empty')}</Alert>}

      {titles && titles.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.100' } }}>
                <TableCell>{t('titles.columns.titleNo')}</TableCell>
                <TableCell>{t('titles.columns.owner')}</TableCell>
                <TableCell>{t('titles.columns.division')}</TableCell>
                <TableCell>{t('titles.columns.area')}</TableCell>
                <TableCell>{t('titles.columns.issuedAt')}</TableCell>
                <TableCell>{t('titles.columns.encumbrances')}</TableCell>
                <TableCell align="right">{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {titles.map((title) => (
                <TableRow key={title.id} hover>
                  <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700 }}>
                    {title.title_no}
                  </TableCell>
                  <TableCell>{title.owners[0]?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    {[title.parcel.division, title.parcel.sub_division].filter(Boolean).join(' / ')}
                  </TableCell>
                  <TableCell>
                    {title.parcel.area_sqm ? `${title.parcel.area_sqm} m²` : '—'}
                  </TableCell>
                  <TableCell>
                    {title.issued_at ? new Date(title.issued_at).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    {title.encumbrances.length > 0 ? (
                      <Chip
                        size="small"
                        color="warning"
                        label={`${t('titles.mortgaged')} (${title.encumbrances.length})`}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={!title.certificate_pdf_path}
                        onClick={() => void handleDownloadCertificate(title)}
                      >
                        {t('titles.downloadBtn')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => setCancelFor(title)}
                      >
                        {t('titles.cancelBtn')}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Ministerial cancellation dialog (guarded, two-step) ─────────────── */}
      <Dialog open={!!cancelFor} onClose={closeCancelDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          {t('titles.cancelDialog.title', { titleNo: cancelFor?.title_no })}
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {t('titles.cancelDialog.warning')}
          </Alert>
          <DialogContentText sx={{ mb: 2 }}>
            {t('titles.cancelDialog.body', {
              owner: cancelFor?.owners[0]?.full_name ?? '—',
            })}
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              label={t('titles.cancelDialog.orderRef')}
              placeholder="e.g. Arrêté N° 0245/Y.14/MINDCAF/D100"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('titles.cancelDialog.reason')}
              multiline
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={cancelConfirmed}
                  onChange={(e) => setCancelConfirmed(e.target.checked)}
                  color="error"
                />
              }
              label={t('titles.cancelDialog.confirmLabel')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog} disabled={cancelMutation.isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={
              cancelMutation.isPending || orderRef.trim().length < 3 || !cancelConfirmed
            }
            onClick={() => cancelFor && cancelMutation.mutate(cancelFor.title_no)}
          >
            {cancelMutation.isPending ? t('common.processing') : t('titles.cancelDialog.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
