'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import ShareButton from '@/components/ShareButton';

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

// Tự zoom vừa khít tuyến đường khi có route mới
function FitRoute({ route }) {
  const map = useMap();
  useEffect(() => {
    if (route?.coords?.length) {
      map.fitBounds(L.latLngBounds(route.coords), { padding: [50, 50] });
    }
  }, [route, map]);
  return null;
}

function PopupCard({ p, onRoute, routing }) {
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
          {p.price === undefined ? (
            <a href="/login" className="price-locked">🔒 Đăng nhập để xem giá</a>
          ) : (
            <span className="price">{formatPrice(p.price)}</span>
          )}
          <span className="area">{p.area} m²</span>
        </div>
        {p.address && <div className="meta">{p.address}</div>}
        <ShareButton
          title={`${p.code} — ${p.title}`}
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/bds/${p.id}`}
        />
        <div className="popup-actions">
          <Link href={`/bds/${p.id}`} className="popup-btn">
            Xem chi tiết →
          </Link>
          <button
            type="button"
            className="popup-btn popup-btn-outline"
            onClick={() => onRoute(p)}
            disabled={routing}
          >
            {routing ? 'Đang tìm…' : '🧭 Đường đi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2 lớp nền: đường phố (Carto Voyager — phong cách giống Google Maps) & vệ tinh (Esri)
const BASE_LAYERS = {
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19, // trên mức này phóng to ảnh tile thay vì trắng
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri — Maxar, Earthstar Geographics',
    maxNativeZoom: 17, // ảnh vệ tinh vùng ven chỉ có đến ~z17
  },
};

export default function MapView({ properties }) {
  const [baseLayer, setBaseLayer] = useState('streets');
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const layer = BASE_LAYERS[baseLayer];

  // Tìm đường từ vị trí hiện tại đến BĐS bằng OSRM (miễn phí, không cần key)
  function handleRoute(p) {
    setRouteError(null);
    if (!navigator.geolocation) {
      setRouteError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setRouting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat0, longitude: lng0 } = pos.coords;
        try {
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${lng0},${lat0};${p.lng},${p.lat}?overview=full&geometries=geojson`
          );
          const json = await res.json();
          const r = json?.routes?.[0];
          if (!r) throw new Error('no route');
          setRoute({
            coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
            origin: [lat0, lng0],
            distanceKm: (r.distance / 1000).toFixed(1),
            durationMin: Math.round(r.duration / 60),
            dest: p,
          });
        } catch {
          setRouteError('Không tìm được đường đi — thử lại sau.');
        }
        setRouting(false);
      },
      () => {
        setRouteError('Không lấy được vị trí của bạn — kiểm tra quyền truy cập vị trí của trình duyệt.');
        setRouting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <MapContainer center={HOA_LAC_CENTER} zoom={14} minZoom={5} maxZoom={19} scrollWheelZoom>
      <TileLayer
        key={baseLayer}
        attribution={layer.attribution}
        url={layer.url}
        maxNativeZoom={layer.maxNativeZoom}
        maxZoom={19}
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
                <PopupCard p={p} onRoute={handleRoute} routing={routing} />
              </Popup>
            </Marker>
          ))}
      </MarkerClusterGroup>

      {/* Tuyến đường đang hiển thị */}
      {route && (
        <>
          <Polyline
            positions={route.coords}
            pathOptions={{ color: '#275838', weight: 5, opacity: 0.85 }}
          />
          <CircleMarker
            center={route.origin}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#2b6cb0', fillOpacity: 1 }}
          />
          <FitRoute route={route} />
        </>
      )}

      {(route || routeError) && (
        <div className="route-banner">
          {route ? (
            <>
              <strong>{route.distanceKm} km</strong> · ~{route.durationMin} phút lái xe
              <span className="route-dest"> → {route.dest.code}</span>
            </>
          ) : (
            <span className="route-err">{routeError}</span>
          )}
          <button
            type="button"
            onClick={() => {
              setRoute(null);
              setRouteError(null);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Nút chuyển lớp nền */}
      <div className="layer-switch">
        <button
          type="button"
          className={baseLayer === 'streets' ? 'active' : ''}
          onClick={() => setBaseLayer('streets')}
        >
          Bản đồ
        </button>
        <button
          type="button"
          className={baseLayer === 'satellite' ? 'active' : ''}
          onClick={() => setBaseLayer('satellite')}
        >
          Vệ tinh
        </button>
      </div>
    </MapContainer>
  );
}
