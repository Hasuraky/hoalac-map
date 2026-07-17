'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';

// Tâm bản đồ: khu Hòa Lạc
const HOA_LAC_CENTER = { lat: 21.008, lng: 105.526 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Ghim màu theo trạng thái
function Pin({ color }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path
        d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9" />
    </svg>
  );
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
        <span
          className="popup-status"
          style={{ color, borderColor: color, background: `${color}22` }}
        >
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

// Marker + gom cụm (MarkerClusterer chính chủ Google)
function Markers({ properties, onSelect }) {
  const map = useMap();
  const clustererRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!map || clustererRef.current) return;
    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      renderer: {
        render: ({ count, position }) => {
          const size = count < 10 ? 36 : count < 50 ? 42 : 48;
          const div = document.createElement('div');
          div.className = 'cluster-icon';
          div.style.width = `${size}px`;
          div.style.height = `${size}px`;
          div.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: div,
            zIndex: 1000 + count,
          });
        },
      },
    });
  }, [map]);

  // Đồng bộ marker vào clusterer mỗi khi danh sách (lọc) thay đổi
  useEffect(() => {
    const c = clustererRef.current;
    if (!c) return;
    c.clearMarkers();
    c.addMarkers(Object.values(markersRef.current));
  }, [properties]);

  const setMarkerRef = (marker, id) => {
    if (marker) markersRef.current[id] = marker;
    else delete markersRef.current[id];
  };

  return properties
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => (
      <AdvancedMarker
        key={p.id}
        position={{ lat: p.lat, lng: p.lng }}
        ref={(m) => setMarkerRef(m, p.id)}
        onClick={() => onSelect(p)}
        title={p.title}
      >
        <Pin color={STATUS_COLORS[p.status] ?? '#8b877c'} />
      </AdvancedMarker>
    ));
}

// Vẽ tuyến đường OSRM + chấm điểm xuất phát, tự zoom vừa khít
function RouteOverlay({ route }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !route) return;
    const line = new google.maps.Polyline({
      path: route.coords.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#275838',
      strokeWeight: 5,
      strokeOpacity: 0.85,
      map,
    });
    const bounds = new google.maps.LatLngBounds();
    route.coords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    map.fitBounds(bounds, 60);
    return () => line.setMap(null);
  }, [map, route]);

  if (!route) return null;
  return (
    <AdvancedMarker position={{ lat: route.origin[0], lng: route.origin[1] }}>
      <div className="origin-dot" />
    </AdvancedMarker>
  );
}

export default function MapView({ properties }) {
  const [selected, setSelected] = useState(null);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);

  // Tìm đường từ vị trí hiện tại đến BĐS bằng OSRM (miễn phí)
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
          setSelected(null);
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

  if (!API_KEY) {
    return (
      <div className="map-loading">
        Chưa cấu hình Google Maps — thêm biến NEXT_PUBLIC_GOOGLE_MAPS_API_KEY vào .env.local / Vercel.
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} language="vi" region="VN">
      <Map
        mapId={MAP_ID}
        defaultCenter={HOA_LAC_CENTER}
        defaultZoom={14}
        gestureHandling="greedy"
        mapTypeControl
        mapTypeControlOptions={{ position: 6 }} /* LEFT_BOTTOM */
        streetViewControl={false}
        fullscreenControl={false}
        className="gmap-container"
      >
        <Markers properties={properties} onSelect={setSelected} />

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            pixelOffset={[0, -38]}
            maxWidth={280}
            onCloseClick={() => setSelected(null)}
          >
            <PopupCard p={selected} onRoute={handleRoute} routing={routing} />
          </InfoWindow>
        )}

        <RouteOverlay route={route} />
      </Map>

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
    </APIProvider>
  );
}
