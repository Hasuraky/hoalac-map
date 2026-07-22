'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import ShareButton from '@/components/ShareButton';

// Tâm bản đồ: khu Hòa Lạc
const HOA_LAC_CENTER = [105.526, 21.008]; // Goong dùng [lng, lat]
const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;

// Style vệ tinh tự dựng từ kho ảnh Goong (style trọn gói của họ lỗi với goong-js)
function goongSatelliteStyle(key) {
  return {
    version: 8,
    sources: {
      'goong-sat': {
        type: 'raster',
        tiles: [`https://satellite.goong.io/{z}/{x}/{y}.png?api_key=${key}`],
        tileSize: 256,
        maxzoom: 20,
        attribution: '© Goong Maps',
      },
    },
    layers: [{ id: 'goong-satellite', type: 'raster', source: 'goong-sat' }],
  };
}

const STYLES = {
  streets: 'https://tiles.goong.io/assets/goong_map_web.json',
};

// Ẩn/hiện các địa điểm (POI) của nền bản đồ — trường học, chùa, quán xá...
function applyPoiVisibility(map, show) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const sourceLayer = layer['source-layer'] ?? '';
    if (layer.type === 'symbol' && (/poi/i.test(layer.id) || /poi/i.test(sourceLayer))) {
      map.setLayoutProperty(layer.id, 'visibility', show ? 'visible' : 'none');
    }
  }
}

// Ghim SVG theo màu trạng thái
function pinElement(color) {
  const el = document.createElement('div');
  el.className = 'goong-pin';
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`;
  return el;
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

export default function MapView({ properties }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const popupRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [baseStyle, setBaseStyle] = useState('satellite'); // mặc định: vệ tinh
  const [showPoi, setShowPoi] = useState(true);
  const showPoiRef = useRef(true);
  showPoiRef.current = showPoi;
  const [selected, setSelected] = useState(null);
  const [popupNode, setPopupNode] = useState(null);
  const [route, setRoute] = useState(null);
  const [routing, setRouting] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [userPos, setUserPos] = useState(null); // [lng, lat]

  // Khởi tạo bản đồ
  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !containerRef.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const map = new goongjs.Map({
      container: containerRef.current,
      style: goongSatelliteStyle(MAPTILES_KEY), // mặc định: vệ tinh
      center: HOA_LAC_CENTER,
      zoom: 13,
      minZoom: 5,
      maxZoom: 19,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    map.on('load', () => setReady(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Đổi lớp nền (đổi xong áp lại trạng thái ẩn/hiện địa điểm)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setStyle(baseStyle === 'satellite' ? goongSatelliteStyle(MAPTILES_KEY) : STYLES.streets);
    map.once('idle', () => applyPoiVisibility(map, showPoiRef.current));
  }, [baseStyle, ready]);

  // Bật/tắt địa điểm nền
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (map.isStyleLoaded()) applyPoiVisibility(map, showPoi);
    else map.once('idle', () => applyPoiVisibility(map, showPoi));
  }, [showPoi, ready]);

  // Lấy vị trí người dùng
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.longitude, pos.coords.latitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Chấm vị trí người dùng
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !userPos) return;
    userMarkerRef.current?.remove();
    const el = document.createElement('div');
    el.className = 'origin-dot';
    userMarkerRef.current = new goongjs.Marker({ element: el }).setLngLat(userPos).addTo(map);
    return () => userMarkerRef.current?.remove();
  }, [userPos, ready]);

  // Vẽ marker BĐS
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Popup dùng chung, nội dung render bằng React portal
    if (!popupRef.current) {
      popupRef.current = new goongjs.Popup({
        offset: 38,
        closeButton: true,
        maxWidth: '280px',
        className: 'goong-popup',
      });
      popupRef.current.on('close', () => setSelected(null));
    }

    properties
      .filter((p) => p.lat != null && p.lng != null)
      .forEach((p) => {
        const el = pinElement(STATUS_COLORS[p.status] ?? '#8b877c');
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          const node = document.createElement('div');
          popupRef.current.setLngLat([p.lng, p.lat]).setDOMContent(node).addTo(map);
          setPopupNode(node);
          setSelected(p);
        });
        const marker = new goongjs.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [properties, ready, baseStyle]);

  // Vẽ tuyến đường
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const draw = () => {
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
      if (!route) return;
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: route.coords },
        },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#275838', 'line-width': 5, 'line-opacity': 0.85 },
      });
      const lngs = route.coords.map((c) => c[0]);
      const lats = route.coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 60, duration: 800 }
      );
    };

    if (map.isStyleLoaded()) draw();
    else map.once('styledata', draw);
  }, [route, ready, baseStyle]);

  // Tìm đường bằng OSRM (miễn phí, không tốn quota Goong)
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
          popupRef.current?.remove();
          setSelected(null);
          setRoute({
            coords: r.geometry.coordinates, // [lng, lat] — đúng chuẩn Goong
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

  if (!MAPTILES_KEY) {
    return (
      <div className="map-loading">
        Chưa cấu hình Goong — thêm biến NEXT_PUBLIC_GOONG_MAPTILES_KEY vào Vercel / .env.local
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="gmap-container" />

      {/* Nội dung popup render bằng React */}
      {selected && popupNode &&
        createPortal(<PopupCard p={selected} onRoute={handleRoute} routing={routing} />, popupNode)}

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

      {/* Nút về vị trí của tôi */}
      {userPos && (
        <button
          type="button"
          className="btn-locate"
          title="Vị trí của tôi"
          onClick={() => mapRef.current?.flyTo({ center: userPos, zoom: 16 })}
        >
          ◎
        </button>
      )}

      {/* Chuyển lớp nền + bật/tắt địa điểm */}
      <div className="layer-switch">
        <button
          type="button"
          className={baseStyle === 'streets' ? 'active' : ''}
          onClick={() => setBaseStyle('streets')}
        >
          Bản đồ
        </button>
        <button
          type="button"
          className={baseStyle === 'satellite' ? 'active' : ''}
          onClick={() => setBaseStyle('satellite')}
        >
          Vệ tinh
        </button>
        {baseStyle === 'streets' && (
          <button
            type="button"
            className={showPoi ? 'active' : ''}
            onClick={() => setShowPoi((v) => !v)}
            title="Ẩn/hiện trường học, chùa, quán xá... của nền bản đồ"
          >
            📍 Địa điểm
          </button>
        )}
      </div>
    </>
  );
}
