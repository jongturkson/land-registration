import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface ApplicationBasic {
  id: string;
  type: string;
  status: string;
  reference_no: string | null;
  applicant: { full_name: string; region: string };
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration',
  PARTIAL_ALIENATION: 'Partial Alienation',
  TOTAL_ALIENATION: 'Total Alienation',
  STATE_LAND: 'State Land',
  PARTITION: 'Partition',
  MORTGAGE: 'Mortgage',
  TRANSFORMATION: 'Transformation',
};

const PAPER_FORMATS = ['A0', 'A1', 'A2', 'A3', 'A4'];
const SCALES = ['1:500', '1:1 000', '1:2 500', '1:5 000', '1:10 000', '1:25 000'];

// Default center: Fako Division, Cameroon (Buea area)
const DEFAULT_CENTER: [number, number] = [4.154, 9.243];
const DEFAULT_ZOOM = 13;

// ── Draw control (inner component — must live inside MapContainer) ──────────

interface DrawControlProps {
  onPolygonDrawn: (coords: number[][][]) => void;
}

function DrawControl({ onPolygonDrawn }: DrawControlProps) {
  const map = useMap();
  // Keep a stable ref to the callback so the effect dependency stays stable
  const callbackRef = useRef(onPolygonDrawn);
  useEffect(() => { callbackRef.current = onPolygonDrawn; }, [onPolygonDrawn]);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: { color: '#1976d2', fillOpacity: 0.2 },
          showArea: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreated = (e: any) => {
      drawnItems.clearLayers();
      const layer = e.layer as L.Layer;
      drawnItems.addLayer(layer);
      if (layer instanceof L.Polygon) {
        const geojson = layer.toGeoJSON();
        callbackRef.current(
          (geojson.geometry as { coordinates: number[][][] }).coordinates,
        );
      }
    };

    map.on('draw:created', handleCreated);

    return () => {
      map.off('draw:created', handleCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map]);

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SurveyorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Spatial state
  const [coordinates, setCoordinates] = useState<number[][][] | null>(null);

  // Report fields
  const [scale, setScale] = useState('');
  const [paperFormat, setPaperFormat] = useState('');
  const [personsPresent, setPersonsPresent] = useState('');

  // Document files
  const [pvFile, setPvFile] = useState<File | null>(null);
  const [cadastralFile, setCadastralFile] = useState<File | null>(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: application, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get<ApplicationBasic>(`/applications/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const handlePolygonDrawn = useCallback((coords: number[][][]) => {
    setCoordinates(coords);
  }, []);

  async function handleSubmit() {
    setError(null);

    if (!coordinates) {
      setError('Please draw the parcel boundary on the map before submitting.');
      return;
    }
    if (!scale) {
      setError('Please select a scale.');
      return;
    }
    if (!paperFormat) {
      setError('Please select a paper format.');
      return;
    }
    const persons = personsPresent
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (persons.length === 0) {
      setError('Please list the persons present at the survey.');
      return;
    }
    if (!pvFile) {
      setError('Please upload the Procès-Verbal de Bornage.');
      return;
    }
    if (!cadastralFile) {
      setError('Please upload the Cadastral Plan.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Upload Procès-Verbal de Bornage
      const pvForm = new FormData();
      pvForm.append('file', pvFile);
      pvForm.append('doc_type', 'PROCES_VERBAL');
      await api.post(`/applications/${id}/documents`, pvForm);

      // Step 2: Upload Cadastral Plan
      const cadastralForm = new FormData();
      cadastralForm.append('file', cadastralFile);
      cadastralForm.append('doc_type', 'CADASTRAL_PLAN');
      await api.post(`/applications/${id}/documents`, cadastralForm);

      // Step 3: Submit survey data + spatial geometry
      await api.post(`/applications/${id}/survey`, {
        coordinates,
        scale,
        paper_format: paperFormat,
        persons_present: persons,
      });

      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      void queryClient.invalidateQueries({ queryKey: ['applications', 'published'] });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          'Submission failed. Please try again.')
        : 'An unexpected error occurred.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading / error / success states ────────────────────────────────────

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
        <Button sx={{ mt: 2 }} onClick={() => navigate('/survey')}>
          ← Back
        </Button>
      </Box>
    );
  }

  if (success) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Survey submitted successfully. The application is now in <strong>SURVEYED</strong> status.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/survey')}>
          Back to Survey Queue
        </Button>
      </Box>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: 4, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="text" color="inherit" onClick={() => navigate('/survey')}>
          ← Back
        </Button>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}
          >
            Cadastral Survey Entry
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {application.reference_no} · {TYPE_LABELS[application.type] ?? application.type} ·{' '}
            {application.applicant.full_name}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Map */}
      <Card elevation={1} sx={{ mb: 2 }}>
        <CardHeader
          title="Parcel Boundary"
          subheader={
            coordinates
              ? `Polygon captured (${coordinates[0]?.length ?? 0} vertices)`
              : 'Use the polygon tool in the top-left of the map to draw the parcel boundary'
          }
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          subheaderTypographyProps={{
            variant: 'caption',
            color: coordinates ? 'success.main' : 'text.secondary',
          }}
        />
        <Divider />
        <Box sx={{ height: 480 }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DrawControl onPolygonDrawn={handlePolygonDrawn} />
          </MapContainer>
        </Box>
      </Card>

      {/* Survey Report Details */}
      <Card elevation={1} sx={{ mb: 2 }}>
        <CardHeader
          title="Survey Report Details"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              select
              label="Scale"
              value={scale}
              onChange={(e) => setScale(e.target.value)}
              fullWidth
            >
              {SCALES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Paper Format"
              value={paperFormat}
              onChange={(e) => setPaperFormat(e.target.value)}
              fullWidth
            >
              {PAPER_FORMATS.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <TextField
            label="Persons Present"
            multiline
            rows={3}
            fullWidth
            placeholder="Enter each person's name on a separate line"
            helperText="List all persons present at the cadastral survey (surveyor, witnesses, etc.)"
            value={personsPresent}
            onChange={(e) => setPersonsPresent(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Document Uploads */}
      <Card elevation={1} sx={{ mb: 3 }}>
        <CardHeader
          title="Survey Documents"
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Procès-Verbal de Bornage */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Procès-Verbal de Bornage
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Official cadastral survey report signed by the surveyor and witnesses (PDF, max 5 MB)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="outlined" component="label" size="small">
                  {pvFile ? 'Change File' : 'Choose File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => setPvFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {pvFile && (
                  <Typography variant="caption" color="success.main">
                    {pvFile.name}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            {/* Cadastral Plan */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Cadastral Plan
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Technical drawing of the parcel with dimensions and bearings (PDF or image, max 5 MB)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="outlined" component="label" size="small">
                  {cadastralFile ? 'Change File' : 'Choose File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => setCadastralFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {cadastralFile && (
                  <Typography variant="caption" color="success.main">
                    {cadastralFile.name}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Submit */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          disabled={isSubmitting}
          onClick={() => void handleSubmit()}
        >
          {isSubmitting ? 'Submitting Survey…' : 'Submit Survey'}
        </Button>
        <Button
          variant="text"
          size="large"
          color="inherit"
          disabled={isSubmitting}
          onClick={() => navigate('/survey')}
        >
          Cancel
        </Button>
      </Box>
    </Box>
  );
}
