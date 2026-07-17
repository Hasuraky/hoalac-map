'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const HOA_LAC_CENTER = [21.008, 105.526];

const pinIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill="#275838" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`,
  className: 'custom-marker-icon',
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Bản đồ nhỏ để chấm vị trí BĐS: click là đặt/di chuyển ghim
export default function LocationPicker({ lat, lng, onPick }) {
  const hasPoint = lat != null && lng != null;
  return (
    <MapContainer
      center={hasPoint ? [lat, lng] : HOA_LAC_CENTER}
      zoom={hasPoint ? 16 : 14}
      scrollWheelZoom
      className="location-picker-map"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} />
      {hasPoint && (
        <Marker
          position={[lat, lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onPick(ll.lat, ll.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}
