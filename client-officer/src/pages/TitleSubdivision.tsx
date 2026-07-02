import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet-draw';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import api from '../lib/api';

interface PolygonGeoJson {
  type: 'Polygon';
  coordinates: number[][][];
}

interface TitleDetails {
  id: string;
  title_no: string;
  status: string;
  parcel: {
    id: string;
    division: string;
    sub_division: string | null;
    situation: string | null;
    area_sqm: string | null;
    geometry: PolygonGeoJson | null;
  };
  owners: { id: string; full_name: string; is_current: boolean }[];
}

// Wires leaflet-draw into the react-leaflet map: polygon tool only, and the
// drawn shape is captured as GeoJSON for the subdivision request.
function DrawControl({ onPolygon }: { onPolygon: (geometry: PolygonGeoJson | null) => void }) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#d32f2f', weight: 2 },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: { featureGroup: drawnItems },
    });
    map.addControl(drawControl);

    function extractPolygon(layer: L.Layer): PolygonGeoJson | null {
      const geo = (layer as L.Polygon).toGeoJSON();
      return geo.geometry.type === 'Polygon' ? (geo.geometry as PolygonGeoJson) : null;
    }

    function handleCreated(event: L.LeafletEvent) {
      const layer = (event as L.DrawEvents.Created).layer;
      drawnItems.clearLayers(); // one sub-parcel at a time
      drawnItems.addLayer(layer);
      onPolygon(extractPolygon(layer));
    }

    function handleEdited(event: L.LeafletEvent) {
      const layers = (event as L.DrawEvents.Edited).layers;
      layers.eachLayer((layer) => onPolygon(extractPolygon(layer)));
    }

    function handleDeleted() {
      onPolygon(null);
    }

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onPolygon]);

  return null;
}

// Zooms the map onto the mother parcel once its geometry is available
function FitToGeometry({ geometry }: { geometry: PolygonGeoJson }) {
  const map = useMap();

  useEffect(() => {
    const layer = L.geoJSON(geometry as GeoJSON.Polygon);
    map.fitBounds(layer.getBounds(), { padding: [30, 30] });
  }, [map, geometry]);

  return null;
}

export default function TitleSubdivision() {
  const { title_no } = useParams<{ title_no: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [drawn, setDrawn] = useState<PolygonGeoJson | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ancestors, setAncestors] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [areaSqm, setAreaSqm] = useState('');
  const [plotNo, setPlotNo] = useState('');
  const [feedback, setFeedback] = useState<{ severity: 'success' | 'error'; text: string } | null>(
    null,
  );

  const { data: title, isLoading, isError } = useQuery({
    queryKey: ['title-details', title_no],
    queryFn: () => api.get<TitleDetails>(`/titles/${title_no}/details`).then((r) => r.data),
    enabled: !!title_no,
  });

  const subdivideMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/titles/${title_no}/subdivide`, {
          new_owner: {
            full_name: ownerName.trim(),
            ...(ancestors.trim() ? { ancestors: ancestors.trim() } : {}),
            ...(birthPlace.trim() ? { birth_place: birthPlace.trim() } : {}),
            ...(birthDate ? { birth_date: birthDate } : {}),
          },
          area_sqm: Number(areaSqm),
          geometry: drawn,
          ...(plotNo.trim() ? { plot_no: plotNo.trim() } : {}),
        })
        .then((r) => r.data as { new_title: { title_no: string } }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['titles'] });
      void queryClient.invalidateQueries({ queryKey: ['title-details', title_no] });
      setFeedback({
        severity: 'success',
        text: t('subdivision.success', { titleNo: data.new_title.title_no }),
      });
      setDrawn(null);
      setOwnerName('');
      setAncestors('');
      setBirthPlace('');
      setBirthDate('');
      setAreaSqm('');
      setPlotNo('');
    },
    onError: (err: unknown) => {
      const text = axios.isAxiosError(err)
        ? ((err.response?.data as { message?: string } | undefined)?.message ??
          t('common.actionFailed'))
        : t('common.actionFailed');
      setFeedback({ severity: 'error', text });
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !title) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{t('common.loadFailed')}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/titles')}>
          {t('common.back')}
        </Button>
      </Box>
    );
  }

  const geometry = title.parcel.geometry;
  const canSubmit =
    !!drawn && ownerName.trim().length >= 2 && Number(areaSqm) > 0 && !subdivideMutation.isPending;

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      <Button onClick={() => navigate('/titles')} sx={{ mb: 1 }}>
        {t('common.back')}
      </Button>
      <Typography variant="h5" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
        {t('subdivision.title', { titleNo: title.title_no })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {t('subdivision.subtitle')}
      </Typography>

      {feedback && (
        <Alert severity={feedback.severity} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
          {feedback.text}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          title={`${t('subdivision.motherParcel')} — ${[
            title.parcel.division,
            title.parcel.sub_division,
            title.parcel.situation,
          ]
            .filter(Boolean)
            .join(', ')}`}
          subheader={
            title.parcel.area_sqm
              ? t('subdivision.remainingArea', { area: title.parcel.area_sqm })
              : undefined
          }
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {geometry ? (
            <>
              <Alert severity={drawn ? 'success' : 'info'} square icon={false}>
                {drawn ? t('subdivision.drawnOk') : t('subdivision.drawHint')}
              </Alert>
              <MapContainer
                center={[4.15, 9.28]}
                zoom={15}
                style={{ height: 480, width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON
                  data={geometry as GeoJSON.Polygon}
                  style={{ color: '#1565c0', weight: 2, fillOpacity: 0.08 }}
                />
                <FitToGeometry geometry={geometry} />
                <DrawControl onPolygon={setDrawn} />
              </MapContainer>
            </>
          ) : (
            <Alert severity="warning" square>
              {t('subdivision.noGeometry')}
            </Alert>
          )}
        </CardContent>
      </Card>

      {geometry && (
        <Card variant="outlined">
          <CardHeader
            title={t('subdivision.newOwner')}
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
          />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <TextField
                required
                label={t('titles.transferDialog.newOwnerName')}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
              <TextField
                label={t('titles.transferDialog.ancestors')}
                value={ancestors}
                onChange={(e) => setAncestors(e.target.value)}
              />
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
              <TextField
                required
                label={t('subdivision.areaSqm')}
                type="number"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
              />
              <TextField
                label={t('subdivision.plotNo')}
                value={plotNo}
                onChange={(e) => setPlotNo(e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button
                variant="contained"
                size="large"
                disabled={!canSubmit}
                onClick={() => subdivideMutation.mutate()}
              >
                {subdivideMutation.isPending ? t('common.processing') : t('subdivision.submit')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
