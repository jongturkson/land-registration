import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration',
  PARTIAL_ALIENATION: 'Partial Alienation',
  TOTAL_ALIENATION: 'Total Alienation',
  STATE_LAND: 'State Land',
  PARTITION: 'Partition',
  MORTGAGE: 'Mortgage',
  TRANSFORMATION: 'Transformation',
};

export default function SurveyorWorkspace() {
  const navigate = useNavigate();

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['applications', 'published'],
    queryFn: () =>
      api.get<Application[]>('/applications').then((r) =>
        r.data.filter((a) => a.status === 'PUBLISHED'),
      ),
  });

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
    <Box sx={{ p: 4 }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}
      >
        Survey Queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Applications in Public Notice stage awaiting cadastral survey.
      </Typography>

      {!applications?.length ? (
        <Alert severity="info">No applications are currently pending survey in your region.</Alert>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Reference No.</TableCell>
                <TableCell>Applicant</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Date Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id} hover>
                  <TableCell
                    sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.8rem' }}
                  >
                    {app.reference_no ?? '—'}
                  </TableCell>
                  <TableCell>{app.applicant.full_name}</TableCell>
                  <TableCell>{TYPE_LABELS[app.type] ?? app.type}</TableCell>
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
                      variant="contained"
                      onClick={() => navigate(`/survey/${app.id}`)}
                    >
                      Open Survey
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
