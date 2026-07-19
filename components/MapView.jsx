'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { APIProvider, Map, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import ShareButton from '@/components/ShareButton';

// Tâm bản đồ: khu Hòa Lạc
const HOA_LAC_CENTER = { lat: 21.008, lng: 105.526 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

// Ghim màu theo trạng thái -> data URI cho google.maps.Marker (không cần Map ID)
function pinIconUrl(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const USER_DOT_URL =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" fill="#2b6cb0" stroke="white" stroke-width="3"/>
    </svg>`
  );

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

// Marker + gom cụm (google.maps.Marker cổ điển — chạy được không cần Map ID)
function Markers({ properties, onSelect }) {
  const map = useMap();
  const clustererRef = useRef(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined') return;

    // Dọn cụm cũ
    clustererRef.current?.clearMarkers();

    const markers = properties
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => {
        const m = new google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          title: p.title,
          icon: {
            url: pinIconUrl(STATUS_COLORS[p.status] ?? '#8b877c'),
            scaledSize: new google.maps.Size(28, 36),
            anchor: new google.maps.Point(14, 36),
          },
        });
        m.addListener('click', () => onSelect(p));
        return m;
      });

    if (!clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) => {
            const size = count < 10 ? 36 : count < 50 ? 42 : 48;
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 3}" fill="#275838" stroke="white" stroke-width="3"/>
            </svg>`;
            return new google.maps.Marker({
              position,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
                scaledSize: new google.maps.Size(size, size),
                anchor: new google.maps.Point(size / 2, size / 2),
              },
              label: { text: String(count), color: '#fff', fontSize: '13px', fontWeight: '700' },
              zIndex: 1000 + count,
            });
          },
        },
      });
    } else {
      clustererRef.current.addMarkers(markers);
    }

    return () => {
      markers.forEach((m) => m.setMap(null));
    };
  }, [map, properties, onSelect]);

  return null;
}

// Chấm vị trí người dùng
function UserDot({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !pos || typeof google === 'undefined') return;
    const m = new google.maps.Marker({
      position: pos,
      title: 'Vị trí của bạn',
      icon: {
        url: USER_DOT_URL,
        scaledSize: new google.maps.Size(20, 20),
        anchor: new google.maps.Point(10, 10),
      },
      zIndex: 9999,
    });
    m.setMap(map);
    return () => m.setMap(null);
  }, [map, pos]);
  return null;
}

// Vẽ tuyến đường OSRM, tự zoom vừa khít
function RouteLine({ route }) {
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
  return null;
}

// Nút bay về vị trí của tôi
function FlyToMe({ pos }) {
  const map = useMap();
  if (!pos || !map) return null;
  return (
    <button
      type="button"
      className="btn-locate"
      title="Vị trí của tôi"
      onClick={() => {
        map.panTo(pos);
        map.setZoom(16);
      }}
    >
      ◎
    </button>
  );
}

function MapInner({ properties }) {
  const [selected, setSelected] = useState(null);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [userPos, setUserPos] = useState(null); // { lat, lng }

  // Tự động lấy vị trí người dùng khi mở bản đồ
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

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
    <>
      <Map
        defaultCenter={HOA_LAC_CENTER}
        defaultZoom={14}
        minZoom={5}
        maxZoom={20}
        gestureHandling="greedy"
        mapTypeControl
        streetViewControl={false}
        fullscreenControl={false}
        className="gmap-container"
      >
        <Markers properties={properties} onSelect={setSelected} />

        {/* Vị trí người dùng */}
        <UserDot pos={userPos} />

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

        <RouteLine route={route} />
        <FlyToMe pos={userPos} />
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
    </>
  );
}

export default function MapView({ properties }) {
  if (!API_KEY) {
    return (
      <div className="map-loading">
        Chưa cấu hình Google Maps — thêm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY vào Vercel / .env.local
      </div>
    );
  }
  return (
    <APIProvider apiKey={API_KEY} language="vi" region="VN">
      <MapInner properties={properties} />
    </APIProvider>
  );
}
