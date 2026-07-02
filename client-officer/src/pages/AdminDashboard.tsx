import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

interface DashboardData {
  applications_by_status: { status: string; count: number }[];
  active_disputes: number;
  valid_titles: number;
  parcels: {
    parcel_id: string;
    title_no: string;
    owner: string | null;
    area_sqm: string | null;
    geometry: GeoJSON.Polygon;
  }[];
}

const PIE_COLORS = [
  '#1565c0', '#2e7d32', '#b45309', '#5c35b5', '#c62828',
  '#00838f', '#6d4c41', '#37474f', '#ad1457', '#827717', '#0277bd', '#4527a0',
];

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 200, borderTop: `4px solid ${color}` }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// Fits the map around every titled parcel once data arrives
function FitToParcels({ parcels }: { parcels: DashboardData['parcels'] }) {
  const map = useMap();

  useEffect(() => {
    if (parcels.length === 0) return;
    const group = L.featureGroup(parcels.map((p) => L.geoJSON(p.geometry)));
    map.fitBounds(group.getBounds(), { padding: [40, 40] });
  }, [map, parcels]);

  return null;
}

export default function AdminDashboard() {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get<DashboardData>('/analytics/dashboard').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{t('common.loadFailed')}</Alert>
      </Box>
    );
  }

  const totalApplications = data.applications_by_status.reduce((sum, g) => sum + g.count, 0);
  const pieData = data.applications_by_status.map((g) => ({
    name: t(`statuses.${g.status}`, { defaultValue: g.status }),
    value: g.count,
  }));

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontFamily: '"Lora", serif', fontWeight: 700 }}>
        {t('analytics.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {t('analytics.subtitle')}
      </Typography>

      {/* ── Top row: KPI cards ──────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <KpiCard label={t('analytics.kpi.totalApplications')} value={totalApplications} color="#1565c0" />
        <KpiCard label={t('analytics.kpi.validTitles')} value={data.valid_titles} color="#2e7d32" />
        <KpiCard label={t('analytics.kpi.activeDisputes')} value={data.active_disputes} color="#c62828" />
        <KpiCard label={t('analytics.kpi.titledParcels')} value={data.parcels.length} color="#b45309" />
      </Box>

      {/* ── Middle row: application status pie chart ───────────────────────── */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader
          title={t('analytics.pieTitle')}
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          {pieData.length === 0 ? (
            <Alert severity="info">—</Alert>
          ) : (
            <Box sx={{ height: 340 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Bottom row: national parcel map ────────────────────────────────── */}
      <Card variant="outlined">
        <CardHeader
          title={t('analytics.mapTitle')}
          titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        />
        <Divider />
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          {data.parcels.length === 0 ? (
            <Alert severity="info" square>
              {t('analytics.mapEmpty')}
            </Alert>
          ) : (
            <MapContainer center={[4.15, 9.28]} zoom={13} style={{ height: 560, width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitToParcels parcels={data.parcels} />
              {data.parcels.map((parcel) => (
                <GeoJSON
                  key={parcel.parcel_id}
                  data={parcel.geometry}
                  style={{ color: '#2e7d32', weight: 2, fillOpacity: 0.15 }}
                >
                  <Tooltip sticky>
                    <strong>{parcel.title_no}</strong>
                    <br />
                    {t('analytics.owner')}: {parcel.owner ?? '—'}
                    <br />
                    {t('analytics.area')}: {parcel.area_sqm ? `${parcel.area_sqm} m²` : '—'}
                  </Tooltip>
                </GeoJSON>
              ))}
            </MapContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
