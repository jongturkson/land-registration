import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import api from '../lib/api';

interface AuditLogRow {
  seq: string;
  actor_id: string;
  actor_role: string;
  event: string;
  entity: string;
  entity_id: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  prev_hash: string | null;
  self_hash: string;
}

interface VerifyResult {
  isValid: boolean;
  brokenAtIndex: number | null;
  message: string;
}

const MONO = '"IBM Plex Mono", "Roboto Mono", monospace';

export default function AuditLedger() {
  const { t } = useTranslation();
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.get<AuditLogRow[]>('/audit/logs').then((r) => r.data),
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.get<VerifyResult>('/audit/verify-chain').then((r) => r.data),
    onSuccess: (result) => setVerifyResult(result),
    onError: () =>
      setVerifyResult({ isValid: false, brokenAtIndex: null, message: t('common.actionFailed') }),
  });

  const columns: GridColDef<AuditLogRow>[] = [
    { field: 'seq', headerName: t('audit.columns.seq'), width: 70 },
    {
      field: 'occurred_at',
      headerName: t('audit.columns.occurredAt'),
      width: 170,
      valueFormatter: (value: string) => new Date(value).toLocaleString(),
    },
    { field: 'event', headerName: t('audit.columns.event'), width: 230, cellClassName: 'ledger-event' },
    { field: 'entity', headerName: t('audit.columns.entity'), width: 110 },
    { field: 'entity_id', headerName: t('audit.columns.entityId'), width: 200 },
    { field: 'actor_role', headerName: t('audit.columns.actorRole'), width: 140 },
    {
      field: 'payload',
      headerName: t('audit.columns.payload'),
      flex: 1,
      minWidth: 260,
      valueGetter: (_value, row) => JSON.stringify(row.payload),
    },
    { field: 'prev_hash', headerName: t('audit.columns.prevHash'), width: 190 },
    { field: 'self_hash', headerName: t('audit.columns.selfHash'), width: 190 },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Box sx={{ flexGrow: 1, minWidth: 300 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
            {t('audit.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            {t('audit.subtitle')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          disabled={verifyMutation.isPending}
          onClick={() => verifyMutation.mutate()}
          sx={{ fontWeight: 700 }}
        >
          {verifyMutation.isPending ? t('audit.checking') : t('audit.runCheck')}
        </Button>
      </Box>

      {verifyResult && (
        <Alert
          severity={verifyResult.isValid ? 'success' : 'error'}
          variant={verifyResult.isValid ? 'standard' : 'filled'}
          sx={{ mb: 3, fontFamily: MONO }}
          onClose={() => setVerifyResult(null)}
        >
          <AlertTitle sx={{ fontWeight: 800, letterSpacing: 1 }}>
            {verifyResult.isValid ? t('audit.chainValid') : t('audit.chainBroken')}
          </AlertTitle>
          {verifyResult.message}
          {verifyResult.brokenAtIndex !== null && (
            <Box sx={{ mt: 1, fontWeight: 700 }}>
              {t('audit.brokenAt', { index: verifyResult.brokenAtIndex })}
            </Box>
          )}
        </Alert>
      )}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {isError && <Alert severity="error">{t('common.loadFailed')}</Alert>}

      {logs && (
        <Paper variant="outlined">
          <DataGrid
            rows={logs}
            columns={columns}
            getRowId={(row) => row.seq}
            density="compact"
            disableRowSelectionOnClick
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
              sorting: { sortModel: [{ field: 'seq', sort: 'desc' }] },
            }}
            pageSizeOptions={[25, 50, 100]}
            sx={{
              border: 'none',
              fontFamily: MONO,
              fontSize: '0.72rem',
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, fontFamily: MONO },
              '& .ledger-event': { fontWeight: 700 },
            }}
          />
        </Paper>
      )}
    </Box>
  );
}
