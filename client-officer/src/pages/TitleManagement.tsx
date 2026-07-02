import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
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

export default function TitleManagement() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [transferFor, setTransferFor] = useState<TitleRow | null>(null);
  const [mortgageFor, setMortgageFor] = useState<TitleRow | null>(null);
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Transfer form state
  const [ownerName, setOwnerName] = useState('');
  const [ancestors, setAncestors] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deedRef, setDeedRef] = useState('');

  // Mortgage form state
  const [creditor, setCreditor] = useState('');
  const [amount, setAmount] = useState('');

  const { data: titles, isLoading, isError } = useQuery({
    queryKey: ['titles', 'VALID'],
    queryFn: () => api.get<TitleRow[]>('/titles').then((r) => r.data),
  });

  function resetForms() {
    setOwnerName('');
    setAncestors('');
    setBirthPlace('');
    setBirthDate('');
    setDeedRef('');
    setCreditor('');
    setAmount('');
  }

  const transferMutation = useMutation({
    mutationFn: (titleNo: string) =>
      api
        .post(`/titles/${titleNo}/transfer`, {
          new_owner: {
            full_name: ownerName.trim(),
            ...(ancestors.trim() ? { ancestors: ancestors.trim() } : {}),
            ...(birthPlace.trim() ? { birth_place: birthPlace.trim() } : {}),
            ...(birthDate ? { birth_date: birthDate } : {}),
          },
          ...(deedRef.trim() ? { deed_reference: deedRef.trim() } : {}),
        })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['titles'] });
      setTransferFor(null);
      resetForms();
      setFeedback({ severity: 'success', text: t('titles.transferDialog.success') });
    },
    onError: (err: unknown) =>
      setFeedback({ severity: 'error', text: errorMessage(err, t('common.actionFailed')) }),
  });

  const mortgageMutation = useMutation({
    mutationFn: (titleNo: string) =>
      api
        .post(`/titles/${titleNo}/mortgage`, {
          creditor: creditor.trim(),
          ...(amount ? { amount: Number(amount) } : {}),
        })
        .then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['titles'] });
      setMortgageFor(null);
      resetForms();
      setFeedback({ severity: 'success', text: t('titles.mortgageDialog.success') });
    },
    onError: (err: unknown) =>
      setFeedback({ severity: 'error', text: errorMessage(err, t('common.actionFailed')) }),
  });

  const isPending = transferMutation.isPending || mortgageMutation.isPending;

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
        {t('titles.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {t('titles.subtitle')}
      </Typography>

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
                      <Button size="small" variant="contained" onClick={() => setTransferFor(title)}>
                        {t('titles.transferBtn')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => setMortgageFor(title)}
                      >
                        {t('titles.mortgageBtn')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/titles/${title.title_no}/subdivide`)}
                      >
                        {t('titles.subdivideBtn')}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Transfer dialog (total alienation) ─────────────────────────────── */}
      <Dialog open={!!transferFor} onClose={() => setTransferFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {t('titles.transferDialog.title', { titleNo: transferFor?.title_no })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('titles.transferDialog.body')}</DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              label={t('titles.transferDialog.newOwnerName')}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('titles.transferDialog.ancestors')}
              value={ancestors}
              onChange={(e) => setAncestors(e.target.value)}
              fullWidth
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label={t('titles.transferDialog.birthPlace')}
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
              />
              <TextField
                label={t('titles.transferDialog.birthDate')}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <TextField
              label={t('titles.transferDialog.deedRef')}
              value={deedRef}
              onChange={(e) => setDeedRef(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferFor(null)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={isPending || ownerName.trim().length < 2}
            onClick={() => transferFor && transferMutation.mutate(transferFor.title_no)}
          >
            {isPending ? t('common.processing') : t('titles.transferDialog.submit')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Mortgage dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!mortgageFor} onClose={() => setMortgageFor(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {t('titles.mortgageDialog.title', { titleNo: mortgageFor?.title_no })}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{t('titles.mortgageDialog.body')}</DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              required
              label={t('titles.mortgageDialog.creditor')}
              value={creditor}
              onChange={(e) => setCreditor(e.target.value)}
              fullWidth
            />
            <TextField
              label={t('titles.mortgageDialog.amount')}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMortgageFor(null)} disabled={isPending}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={isPending || creditor.trim().length < 2}
            onClick={() => mortgageFor && mortgageMutation.mutate(mortgageFor.title_no)}
          >
            {isPending ? t('common.processing') : t('titles.mortgageDialog.submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
