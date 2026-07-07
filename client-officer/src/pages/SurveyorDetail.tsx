import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import L from 'leaflet';
import { MapContainer, TileLayer, LayersControl, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import '../lib/leafletDraw'; // leaflet-draw + Leaflet 1.9 pointer-event patch
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';
import { trackFor } from '../lib/workflow';

// ── Types ──────────────────────────────────────────────────────────────────

interface SourceTitleBasic {
  title_no: string;
  area_sqm: string | null;
  geometry: GeoJSON.Polygon | null;
}

interface ApplicationBasic {
  id: string;
  type: string;
  status: string;
  reference_no: string | null;
  applicant: { full_name: string; region: string };
  source_title: SourceTitleBasic | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  DIRECT_REGISTRATION: 'Direct Registration',
  PARTIAL_ALIENATION: 'Partial Alienation',
  TOTAL_ALIENATION: 'Total Alienation',
  STATE_LAND: 'State Land',
  PARTITION: 'Partition',
  MORTGAGE: 'Mortgage',
  MORTGAGE_RELEASE: 'Mortgage Release',
  TRANSFORMATION: 'Transformation',
};

const PAPER_FORMATS = ['A0', 'A1', 'A2', 'A3', 'A4'];
const SCALES = ['1:500', '1:1 000', '1:2 500', '1:5 000', '1:10 000', '1:25 000'];

// Default center: Fako Division, Cameroon (Buea area)
const DEFAULT_CENTER: [number, number] = [4.154, 9.243];
const DEFAULT_ZOOM = 13;

// ── Geodesic helpers ────────────────────────────────────────────────────────

const EARTH_RADIUS = 6378137;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Geodesic area of a GeoJSON linear ring ([lng, lat] positions) in m². */
function ringAreaSqm(ring: number[][]): number {
  if (ring.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i]!;
    const p2 = ring[(i + 1) % ring.length]!;
    total +=
      (toRad(p2[0]!) - toRad(p1[0]!)) * (2 + Math.sin(toRad(p1[1]!)) + Math.sin(toRad(p2[1]!)));
  }
  return Math.abs((total * EARTH_RADIUS * EARTH_RADIUS) / 2);
}

/** Ray-casting point-in-polygon test for a [lng, lat] point against a ring. */
function pointInRing(point: number[], ring: number[][]): boolean {
  const [x, y] = [point[0]!, point[1]!];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]!;
    const yi = ring[i]![1]!;
    const xj = ring[j]![0]!;
    const yj = ring[j]![1]!;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Quick client-side hint: every vertex of the child ring inside the mother ring.
 *  (The server runs the authoritative PostGIS ST_Within check.) */
function verticesInsideMother(child: number[][][], mother: GeoJSON.Polygon): boolean {
  const motherRing = mother.coordinates[0];
  if (!motherRing) return true;
  const childRing = child[0] ?? [];
  return childRing.every((v) => pointInRing(v, motherRing as number[][]));
}

// ── Map sub-components (must live inside MapContainer) ─────────────────────

interface DrawControlProps {
  drawnItemsRef: React.MutableRefObject<L.FeatureGroup | null>;
  onPolygonChange: (coords: number[][][] | null) => void;
}

function DrawControl({ drawnItemsRef, onPolygonChange }: DrawControlProps) {
  const map = useMap();
  const callbackRef = useRef(onPolygonChange);
  useEffect(() => { callbackRef.current = onPolygonChange; }, [onPolygonChange]);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: { color: '#1976d2', fillOpacity: 0.2 },
          showArea: true,
          allowIntersection: false,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
      },
      // Vertex editing: drag any vertex of the drawn polygon, then Save
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    const emitCurrent = () => {
      let coords: number[][][] | null = null;
      drawnItems.eachLayer((layer) => {
        if (layer instanceof L.Polygon) {
          const geojson = layer.toGeoJSON();
          coords = (geojson.geometry as { coordinates: number[][][] }).coordinates;
        }
      });
      callbackRef.current(coords);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreated = (e: any) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer as L.Layer);
      emitCurrent();
    };

    map.on('draw:created', handleCreated);
    map.on('draw:edited', emitCurrent);
    map.on('draw:deleted', emitCurrent);

    return () => {
      map.off('draw:created', handleCreated);
      map.off('draw:edited', emitCurrent);
      map.off('draw:deleted', emitCurrent);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      drawnItemsRef.current = null;
    };
  }, [map, drawnItemsRef]);

  return null;
}

// Fit the view around the mother parcel when it exists
function FitToGeometry({ geometry }: { geometry: GeoJSON.Polygon | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geometry) return;
    const layer = L.geoJSON(geometry);
    map.fitBounds(layer.getBounds(), { padding: [40, 40] });
  }, [map, geometry]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SurveyorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Spatial state
  const [coordinates, setCoordinates] = useState<number[][][] | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  // GPS coordinate table entry (one "lat, lng" pair per line)
  const [gpsText, setGpsText] = useState('');
  const [gpsError, setGpsError] = useState<string | null>(null);

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

  const handlePolygonChange = useCallback((coords: number[][][] | null) => {
    setCoordinates(coords);
  }, []);

  const isCarveOut = application ? trackFor(application.type) === 'CARVE_OUT' : false;
  const motherGeometry = application?.source_title?.geometry ?? null;

  // Live geodesic area of the drawn polygon
  const drawnAreaSqm = useMemo(
    () => (coordinates?.[0] ? ringAreaSqm(coordinates[0]) : null),
    [coordinates],
  );

  // Client-side containment hint for carve-outs (server check is authoritative)
  const outsideMother = useMemo(
    () =>
      isCarveOut && coordinates && motherGeometry
        ? !verticesInsideMother(coordinates, motherGeometry)
        : false,
    [isCarveOut, coordinates, motherGeometry],
  );

  // Plot a polygon from typed GPS coordinates onto the map
  function plotGpsCoordinates() {
    setGpsError(null);
    const lines = gpsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 3) {
      setGpsError('Enter at least 3 vertices — one "latitude, longitude" pair per line.');
      return;
    }

    const latlngs: [number, number][] = [];
    for (const [idx, line] of lines.entries()) {
      const parts = line.split(/[,;\s]+/).filter(Boolean).map(Number);
      if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) {
        setGpsError(`Line ${idx + 1} is not a valid "latitude, longitude" pair: "${line}"`);
        return;
      }
      const [lat, lng] = [parts[0]!, parts[1]!];
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        setGpsError(`Line ${idx + 1}: latitude must be within ±90 and longitude within ±180.`);
        return;
      }
      latlngs.push([lat, lng]);
    }

    const drawnItems = drawnItemsRef.current;
    if (!drawnItems) return;
    drawnItems.clearLayers();
    const polygon = L.polygon(latlngs, { color: '#1976d2', fillOpacity: 0.2 });
    drawnItems.addLayer(polygon);

    const geojson = polygon.toGeoJSON();
    setCoordinates((geojson.geometry as { coordinates: number[][][] }).coordinates);
  }

  async function handleSubmit() {
    setError(null);

    if (!coordinates) {
      setError('Please draw the parcel boundary on the map (or plot GPS coordinates) before submitting.');
      return;
    }
    if (outsideMother) {
      setError(
        'The drawn parcel extends beyond the mother title boundary. The child parcel must lie entirely inside the blue mother polygon.',
      );
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
          Survey submitted successfully. The application is now in <strong>SURVEYED</strong> status
          {isCarveOut ? ' and returns to the Conservateur Foncier for clearance.' : '.'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/survey')}>
          Back to Survey Queue
        </Button>
      </Box>
    );
  }

  const motherArea = application.source_title?.area_sqm
    ? Number(application.source_title.area_sqm)
    : null;

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
        {isCarveOut && (
          <Chip
            color="warning"
            label={`Carve-out from ${application.source_title?.title_no ?? 'mother title'}`}
            sx={{ fontWeight: 700 }}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Carve-out guidance */}
      {isCarveOut && (
        <Alert severity={motherGeometry ? 'info' : 'error'} sx={{ mb: 2 }}>
          {motherGeometry ? (
            <>
              The <strong>mother parcel</strong> (title {application.source_title?.title_no},{' '}
              {motherArea ? `${motherArea.toLocaleString()} m²` : 'area on file'}) is shown in{' '}
              <strong style={{ color: '#b45309' }}>amber</strong> on the map. Draw the child parcel{' '}
              <strong>entirely inside</strong> that boundary — the server rejects any polygon that
              crosses it.
            </>
          ) : (
            <>
              The mother title has no registered geometry on file — the carve-out cannot be
              validated spatially. Contact the Conservation Foncière before proceeding.
            </>
          )}
        </Alert>
      )}

      {/* Map */}
      <Card elevation={1} sx={{ mb: 2 }}>
        <CardHeader
          title="Parcel Boundary"
          subheader={
            coordinates
              ? `Polygon captured (${(coordinates[0]?.length ?? 0)} vertices · ${
                  drawnAreaSqm ? `${Math.round(drawnAreaSqm).toLocaleString()} m²` : '—'
                })${outsideMother ? ' — OUTSIDE MOTHER BOUNDARY' : ''}`
              : 'Use the polygon tool (top-left) to draw, the edit tool to drag vertices, or plot typed GPS coordinates below'
          }
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          subheaderTypographyProps={{
            variant: 'caption',
            color: outsideMother ? 'error' : coordinates ? 'success.main' : 'text.secondary',
          }}
        />
        <Divider />
        <Box sx={{ height: 480 }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Street Map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite Imagery">
                <TileLayer
                  attribution="Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* Mother parcel reference layer (locked — not editable) */}
            {motherGeometry && (
              <GeoJSON
                data={motherGeometry}
                style={{ color: '#b45309', weight: 3, dashArray: '6 4', fillOpacity: 0.06 }}
              />
            )}
            <FitToGeometry geometry={motherGeometry} />
            <DrawControl drawnItemsRef={drawnItemsRef} onPolygonChange={handlePolygonChange} />
          </MapContainer>
        </Box>
      </Card>

      {/* Area comparison for carve-outs */}
      {isCarveOut && drawnAreaSqm !== null && motherArea !== null && (
        <Alert
          severity={outsideMother || drawnAreaSqm >= motherArea ? 'warning' : 'success'}
          sx={{ mb: 2 }}
        >
          Child parcel ≈ {Math.round(drawnAreaSqm).toLocaleString()} m² of the mother's{' '}
          {motherArea.toLocaleString()} m² — the mother will retain ≈{' '}
          {Math.max(0, Math.round(motherArea - drawnAreaSqm)).toLocaleString()} m² after issuance.
        </Alert>
      )}

      {/* Typed GPS coordinates (field instrument readings) */}
      <Card elevation={1} sx={{ mb: 2 }}>
        <CardHeader
          title="GPS Coordinate Entry"
          subheader='Optional — type the vertices read from the field instrument, one "latitude, longitude" pair per line, then plot them.'
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          subheaderTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
        />
        <Divider />
        <CardContent>
          {gpsError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGpsError(null)}>
              {gpsError}
            </Alert>
          )}
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder={'4.15420, 9.24310\n4.15480, 9.24390\n4.15410, 9.24450'}
            value={gpsText}
            onChange={(e) => setGpsText(e.target.value)}
            slotProps={{ input: { sx: { fontFamily: '"IBM Plex Mono", monospace' } } }}
          />
          <Button variant="outlined" sx={{ mt: 1.5 }} onClick={plotGpsCoordinates}>
            Plot Coordinates on Map
          </Button>
        </CardContent>
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
          disabled={isSubmitting || (isCarveOut && !motherGeometry)}
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
