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

const M_PER_DEG = 111320;

// center [lng,lat] + chiều rộng (m) + tỉ lệ (w/h) -> 4 góc chữ nhật thẳng (không xoay, không méo)
function rectCoords(center, widthM, aspect) {
  const [lng, lat] = center;
  const heightM = widthM / aspect;
  const dLng = widthM / 2 / (M_PER_DEG * Math.cos((lat * Math.PI) / 180));
  const dLat = heightM / 2 / M_PER_DEG;
  return [
    [lng - dLng, lat + dLat], // TL
    [lng + dLng, lat + dLat], // TR
    [lng + dLng, lat - dLat], // BR
    [lng - dLng, lat - dLat], // BL
  ];
}

// Từ 4 góc đã lưu suy ra center + width + aspect
function fromCoords(coords) {
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const center = [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  const widthM = (Math.max(...lngs) - Math.min(...lngs)) * M_PER_DEG * Math.cos((center[1] * Math.PI) / 180);
  const heightM = (Math.max(...lats) - Math.min(...lats)) * M_PER_DEG;
  return { center, widthM, aspect: heightM ? widthM / heightM : 1 };
}

export default function OverlayEditor({ project }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const centerMarkerRef = useRef(null);

  const centerRef = useRef([project.center_lng ?? 105.526, project.center_lat ?? 21.008]);
  const aspectRef = useRef(1);
  const widthRef = useRef(400);

  const [ready, setReady] = useState(false);
  const [imgUrl, setImgUrl] = useState(overlayUrl(project.overlay_path));
  const [imgPath, setImgPath] = useState(project.overlay_path || null);
  const [opacity, setOpacity] = useState(project.overlay_opacity ?? 0.85);
  const [widthM, setWidthM] = useState(400);
  const [hasOverlay, setHasOverlay] = useState(!!project.overlay_path);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Vẽ lại ảnh + marker tâm theo center/width hiện tại
  function refresh() {
    const map = mapRef.current;
    if (!map || !imgUrl) return;
    const coords = rectCoords(centerRef.current, widthRef.current, aspectRef.current);
    if (map.getLayer('overlay-layer')) map.removeLayer('overlay-layer');
    if (map.getSource('overlay')) map.removeSource('overlay');
    map.addSource('overlay', { type: 'image', url: imgUrl, coordinates: coords });
    map.addLayer({ id: 'overlay-layer', type: 'raster', source: 'overlay', paint: { 'raster-opacity': opacity } });

    // Marker tâm để kéo di chuyển
    if (!centerMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'overlay-center-handle';
      el.textContent = '✥';
      centerMarkerRef.current = new goongjs.Marker({ element: el, draggable: true })
        .setLngLat(centerRef.current)
        .addTo(map);
      centerMarkerRef.current.on('drag', () => {
        const ll = centerMarkerRef.current.getLngLat();
        centerRef.current = [ll.lng, ll.lat];
        refresh();
      });
    } else {
      centerMarkerRef.current.setLngLat(centerRef.current);
    }
  }

  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !containerRef.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const map = new goongjs.Map({
      container: containerRef.current,
      style: SAT_STYLE(MAPTILES_KEY),
      center: centerRef.current,
      zoom: project.zoom ?? 16,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    map.on('load', () => {
      setReady(true);
      if (project.overlay_coords && imgUrl) {
        const d = fromCoords(project.overlay_coords);
        centerRef.current = d.center;
        widthRef.current = d.widthM;
        aspectRef.current = d.aspect;
        setWidthM(Math.round(d.widthM));
        refresh();
      }
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Đổi độ mờ
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer && map.getLayer('overlay-layer')) {
      map.setPaintProperty('overlay-layer', 'raster-opacity', opacity);
    }
  }, [opacity]);

  // Đổi kích thước (giữ tỉ lệ)
  function changeWidth(v) {
    setWidthM(v);
    widthRef.current = v;
    refresh();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      // đọc tỉ lệ ảnh
      const aspect = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
        img.onerror = () => resolve(1);
        img.src = URL.createObjectURL(file);
      });
      aspectRef.current = aspect;

      const path = await uploadOverlay(project.id, file);
      setImgPath(path);
      setImgUrl(overlayUrl(path));
      setHasOverlay(true);
      // đợi imgUrl vào state rồi vẽ
      setTimeout(refresh, 60);
    } catch (err) {
      setMsg('Lỗi tải ảnh: ' + err.message);
    }
    setBusy(false);
  }

  async function save() {
    if (!imgPath) { setMsg('Chưa có ảnh sơ đồ.'); return; }
    setBusy(true); setMsg(null);
    const coords = rectCoords(centerRef.current, widthRef.current, aspectRef.current);
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overlay_path: imgPath, overlay_coords: coords, overlay_opacity: opacity }),
    });
    const json = await res.json();
    setBusy(false);
    setMsg(res.ok ? 'Đã lưu sơ đồ ✓' : 'Lỗi: ' + json.error);
  }

  if (!MAPTILES_KEY) return <div className="detail-page">Chưa cấu hình Goong.</div>;

  return (
    <div className="overlay-editor">
      <div ref={containerRef} className="overlay-map" />

      <div className="overlay-tools">
        <label className="btn-secondary overlay-upload">
          {hasOverlay ? 'Đổi ảnh sơ đồ' : '+ Tải ảnh sơ đồ (PNG)'}
          <input type="file" accept="image/*" onChange={handleFile} disabled={busy} hidden />
        </label>

        {hasOverlay && (
          <>
            <label className="overlay-opacity">
              Kích thước (rộng {widthM} m)
              <input type="range" min="50" max="3000" step="10" value={widthM}
                onChange={(e) => changeWidth(Number(e.target.value))} />
            </label>
            <label className="overlay-opacity">
              Độ mờ: {Math.round(opacity * 100)}%
              <input type="range" min="0.2" max="1" step="0.05" value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))} />
            </label>
            <p className="form-hint">Kéo dấu ✥ ở giữa để di chuyển sơ đồ. Ảnh giữ nguyên tỉ lệ.</p>
          </>
        )}

        {msg && <div className={msg.startsWith('Đã lưu') ? 'overlay-ok' : 'login-error'}>{msg}</div>}

        <button type="button" className="btn-primary" onClick={save} disabled={busy || !hasOverlay}>
          {busy ? 'Đang xử lý…' : 'Lưu sơ đồ'}
        </button>
      </div>
    </div>
  );
}
