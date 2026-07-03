import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import api from '../../lib/api';
import { getUser } from '../../lib/auth';

// ── Types ──────────────────────────────────────────────────────────────────

interface Official {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  region: string;
  department: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  phone: string | null;
}

// Statutory office names (what the Admin picks) → shown for internal roles
const STATUTORY_OPTIONS = [
  { value: 'SDO', label: 'Sub-Divisional Officer (SDO)' },
  { value: 'SURVEYOR', label: 'Sworn Surveyor' },
  { value: 'REGIONAL_DELEGATE', label: 'Regional Delegate' },
  { value: 'CONSERVATEUR', label: 'Conservateur Foncier (Registrar)' },
  { value: 'NOTARY', label: 'Notary Public' },
  { value: 'RECEIVER', label: 'Receiver of Domains' },
] as const;

const ROLE_LABELS: Record<string, string> = {
  sub_divisional_officer: 'SDO',
  surveyor: 'Sworn Surveyor',
  regional_delegate: 'Regional Delegate',
  divisional_delegate: 'Divisional Delegate',
  registrar: 'Conservateur Foncier',
  notary: 'Notary Public',
  receiver: 'Receiver of Domains',
  governor: 'Governor',
  chief: 'Chief',
  admin: 'Administrator',
};

interface NewOfficialForm {
  email: string;
  full_name: string;
  department: string;
  role: string;
}

const EMPTY_FORM: NewOfficialForm = { email: '', full_name: '', department: '', role: '' };

function apiErrorMessage(err: unknown, fallback: string): string {
  return axios.isAxiosError(err)
    ? ((err.response?.data as { message?: string } | undefined)?.message ?? fallback)
    : fallback;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function UserManagement() {
  const queryClient = useQueryClient();
  const me = getUser();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<NewOfficialForm>(EMPTY_FORM);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: officials, isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get<Official[]>('/admin/users').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: NewOfficialForm) =>
      api
        .post<{ user: Official; temporary_password: string }>('/admin/users', payload)
        .then((r) => r.data),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setError(null);
      setTempPassword(data.temporary_password);
    },
    onError: (err: unknown) => setError(apiErrorMessage(err, 'Failed to create the account.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      api.put(`/admin/users/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setError(null);
    },
    onError: (err: unknown) => setError(apiErrorMessage(err, 'Failed to update account status.')),
  });

  const formValid =
    /\S+@\S+\.\S+/.test(form.email) &&
    form.full_name.trim().length > 0 &&
    form.department.trim().length > 0 &&
    form.role.length > 0;

  const columns: GridColDef<Official>[] = [
    { field: 'full_name', headerName: 'Full Name', flex: 1.2, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1.3, minWidth: 200 },
    {
      field: 'role',
      headerName: 'Statutory Role',
      flex: 1,
      minWidth: 160,
      valueGetter: (value: string) => ROLE_LABELS[value] ?? value,
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 140,
      valueGetter: (value: string | null) => value ?? '—',
    },
    { field: 'region', headerName: 'Region', width: 90 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params: GridRenderCellParams<Official>) => (
        <Chip
          size="small"
          label={params.row.status}
          color={params.row.status === 'ACTIVE' ? 'success' : 'default'}
          sx={{ fontWeight: 700 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Active',
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Official>) => (
        <Switch
          size="small"
          checked={params.row.status === 'ACTIVE'}
          disabled={params.row.id === me?.id || statusMutation.isPending}
          onChange={(_e, checked) =>
            statusMutation.mutate({
              id: params.row.id,
              status: checked ? 'ACTIVE' : 'SUSPENDED',
            })
          }
          slotProps={{ input: { 'aria-label': `Toggle ${params.row.full_name}` } }}
        />
      ),
    },
  ];

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
            Official Accounts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Provision, suspend and re-activate the accounts of statutory officials. Every action
            is recorded in the tamper-evident audit ledger.
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => { setError(null); setAddOpen(true); }}>
          Add Official
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      ) : isError ? (
        <Alert severity="error">Failed to load official accounts. Please refresh the page.</Alert>
      ) : (
        <Paper elevation={1}>
          <DataGrid
            rows={officials ?? []}
            columns={columns}
            disableRowSelectionOnClick
            initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
            pageSizeOptions={[10, 25, 50]}
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50' } }}
          />
        </Paper>
      )}

      {/* Add Official dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Provision a New Official Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            A temporary password will be generated and shown once — convey it to the official
            through a secure channel. The account is created in your region.
          </DialogContentText>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="Official Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Department / Service"
              placeholder="e.g. Divisional Lands Service, Fako"
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Statutory Role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              fullWidth
            >
              {STATUTORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!formValid || createMutation.isPending}
            onClick={() => createMutation.mutate(form)}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* One-time temporary password display */}
      <Dialog open={!!tempPassword} onClose={() => setTempPassword(null)} fullWidth maxWidth="xs">
        <DialogTitle>Account Created</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Share this temporary password with the official through a secure channel. It will not
            be shown again.
          </DialogContentText>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: 'center',
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: 1,
              bgcolor: 'grey.50',
            }}
          >
            {tempPassword}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setTempPassword(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
