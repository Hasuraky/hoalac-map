'use client';

import { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { overlayUrl, uploadOverlay } from '@/lib/projects';

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
const SAT_STYLE = (key) => ({
  version: 8,
  sources: { s: { type: 'raster', tiles: [`https://satellite.goong.io/{z}/{x}/{y}.png?api_key=${key}`], tileSize: 256, maxzoom: 20 } },
  layers: [{ id: 's', type: 'raster', source: 's' }],
});

// mét -> độ (xấp xỉ) để tạo khung vuông ban đầu quanh tâm
function squareCoords(center, meters) {
  const [lng, lat] = center;
  const dLat = meters / 2 / 111320;
  const dLng = meters / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lng - dLng, lat + dLat], // TL
    [lng + dLng, lat + dLat], // TR
    [lng + dLng, lat - dLat], // BR
    [lng - dLng, lat - dLat], // BL
  ];
}

// project: bản ghi dự án (có center + overlay sẵn nếu đã lưu)
export default function OverlayEditor({ project }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const cornerMarkersRef = useRef([]);
  const coordsRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [imgUrl, setImgUrl] = useState(overlayUrl(project.overlay_path));
  const [imgPath, setImgPath] = useState(project.overlay_path || null);
  const [opacity, setOpacity] = useState(project.overlay_opacity ?? 0.85);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const center = [
    project.center_lng ?? 105.526,
    project.center_lat ?? 21.008,
  ];

  // Cập nhật ảnh trên bản đồ theo 4 góc hiện tại
  function refreshOverlay() {
    const map = mapRef.current;
    if (!map || !imgUrl || !coordsRef.current) return;
    if (map.getLayer('overlay-layer')) map.removeLayer('overlay-layer');
    if (map.getSource('overlay')) map.removeSource('overlay');
    map.addSource('overlay', { type: 'image', url: imgUrl, coordinates: coordsRef.current });
    map.addLayer({ id: 'overlay-layer', type: 'raster', source: 'overlay', paint: { 'raster-opacity': opacity } });
  }

  // Đặt lại 4 marker góc (kéo được)
  function placeCorners() {
    const map = mapRef.current;
    cornerMarkersRef.current.forEach((m) => m.remove());
    cornerMarkersRef.current = [];
    if (!coordsRef.current) return;
    coordsRef.current.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'overlay-corner';
      const marker = new goongjs.Marker({ element: el, draggable: true }).setLngLat(c).addTo(map);
      marker.on('drag', () => {
        const ll = marker.getLngLat();
        coordsRef.current[i] = [ll.lng, ll.lat];
        refreshOverlay();
      });
      cornerMarkersRef.current.push(marker);
    });
  }

  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !containerRef.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const map = new goongjs.Map({
      container: containerRef.current,
      style: SAT_STYLE(MAPTILES_KEY), // mặc định vệ tinh để căn thực địa
      center,
      zoom: project.zoom ?? 16,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    map.on('load', () => {
      setReady(true);
      coordsRef.current = project.overlay_coords || null;
      if (imgUrl && coordsRef.current) {
        refreshOverlay();
        placeCorners();
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đổi độ mờ
  useEffect(() => {
    const map = mapRef.current;
    if (map && map.getLayer && map.getLayer('overlay-layer')) {
      map.setPaintProperty('overlay-layer', 'raster-opacity', opacity);
    }
  }, [opacity]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const path = await uploadOverlay(project.id, file);
      const url = overlayUrl(path);
      setImgPath(path);
      setImgUrl(url);
      // Nếu chưa có khung -> tạo khung vuông ~400m quanh tâm
      if (!coordsRef.current) coordsRef.current = squareCoords(center, 400);
      // đợi state imgUrl cập nhật rồi vẽ
      setTimeout(() => { refreshOverlay(); placeCorners(); }, 50);
    } catch (err) {
      setMsg('Lỗi tải ảnh: ' + err.message);
    }
    setBusy(false);
  }

  async function save() {
    if (!imgPath || !coordsRef.current) {
      setMsg('Chưa có ảnh hoặc chưa đặt khung.');
      return;
    }
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        overlay_path: imgPath,
        overlay_coords: coordsRef.current,
        overlay_opacity: opacity,
      }),
    });
    const json = await res.json();
    setBusy(false);
    setMsg(res.ok ? 'Đã lưu sơ đồ ✓' : 'Lỗi: ' + json.error);
  }

  if (!MAPTILES_KEY) {
    return <div className="detail-page">Chưa cấu hình Goong.</div>;
  }

  return (
    <div className="overlay-editor">
      <div ref={containerRef} className="overlay-map" />

      <div className="overlay-tools">
        <label className="btn-secondary overlay-upload">
          {imgUrl ? 'Đổi ảnh sơ đồ' : '+ Tải ảnh sơ đồ (PNG/SVG)'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={busy} hidden />
        </label>

        {imgUrl && (
          <label className="overlay-opacity">
            Độ mờ: {Math.round(opacity * 100)}%
            <input type="range" min="0.2" max="1" step="0.05" value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))} />
          </label>
        )}

        <p className="form-hint">Kéo 4 chấm ở góc ảnh để khớp với thực địa trên nền vệ tinh.</p>
        {msg && <div className={msg.startsWith('Đã lưu') ? 'overlay-ok' : 'login-error'}>{msg}</div>}

        <button type="button" className="btn-primary" onClick={save} disabled={busy || !imgUrl}>
          {busy ? 'Đang xử lý…' : 'Lưu sơ đồ'}
        </button>
      </div>
    </div>
  );
}
