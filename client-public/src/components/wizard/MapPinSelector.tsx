import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Box, Typography } from '@mui/material';

// Avoid broken-image marker by using an inline SVG div-icon
const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
    <path fill="#C0392B" d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.27 21.73 0 14 0z"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  className: '',
});

type Props = {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
};

// Buea, Cameroon as the default map centre
const DEFAULT_CENTER: [number, number] = [4.154, 9.242];

export default function MapPinSelector({ lat, lng, onChange }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Keep a stable ref to onChange so the click handler never goes stale
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialise the map once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el).setView(DEFAULT_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon: PIN_ICON }).addTo(map);
      }
      onChangeRef.current(clickLat, clickLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync an externally-set lat/lng (e.g. when the user navigates back to this step)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat === undefined || lng === undefined) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: PIN_ICON }).addTo(map);
    }
    map.panTo([lat, lng]);
  }, [lat, lng]);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t('wizard.map.hint')}
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          height: 320,
          width: '100%',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      />
      {lat !== undefined && lng !== undefined && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {t('wizard.map.pinned')}: {lat.toFixed(5)}, {lng.toFixed(5)}
        </Typography>
      )}
    </Box>
  );
}
