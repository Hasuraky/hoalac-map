'use client';

import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';

// Tâm bản đồ: khu Hòa Lạc
const HOA_LAC_CENTER = [21.008, 105.526];

// Marker hình pin theo màu trạng thái
function createPinIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-marker-icon',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

// Icon cụm marker — màu moss green theo theme
function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 42 : 48;
  return L.divIcon({
    html: `<div class="cluster-icon" style="width:${size}px;height:${size}px;">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function PopupCard({ p }) {
  const color = STATUS_COLORS[p.status] ?? '#8b877c';
  return (
    <div className="popup-card">
      <div className="popup-thumb">
        {p.thumbnail ? (
          <img src={p.thumbnail} alt={p.title} />
        ) : (
          <div className="popup-thumb-fallback">{p.type ?? 'BĐS'}</div>
        )}
        <span className="popup-status" style={{ color, borderColor: color, background: `${color}22` }}>
          {STATUS_LABELS[p.status] ?? p.status}
        </span>
      </div>
      <div className="popup-body">
        <p className="popup-code">{p.code}</p>
        <h3>{p.title}</h3>
        <div className="popup-metrics">
          <span className="price">{formatPrice(p.price)}</span>
          <span className="area">{p.area} m²</span>
        </div>
        <div className="meta">{p.address}</div>
        <Link href={`/bds/${p.id}`} className="popup-btn">
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}

export default function MapView({ properties }) {
  return (
    <MapContainer center={HOA_LAC_CENTER} zoom={14} minZoom={11} maxZoom={19} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        maxClusterRadius={60}
        showCoverageOnHover={false}
        zoomToBoundsOnClick
        spiderfyOnMaxZoom
      >
        {properties
          .filter((p) => p.lat != null && p.lng != null)
          .map((p) => (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={createPinIcon(STATUS_COLORS[p.status] ?? '#8b877c')}
            >
              <Popup minWidth={250} maxWidth={260}>
                <PopupCard p={p} />
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
