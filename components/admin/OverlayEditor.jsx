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

  const imgUrlRef = useRef(overlayUrl(project.overlay_path));
  const drawnUrlRef = useRef(null); // URL ảnh đang vẽ trên bản đồ
  const [ready, setReady] = useState(false);
  const [imgUrl, setImgUrl] = useState(overlayUrl(project.overlay_path));
  const [imgPath, setImgPath] = useState(project.overlay_path || null);
  const [opacity, setOpacity] = useState(project.overlay_opacity ?? 0.85);
  const [widthM, setWidthM] = useState(400);
  // Điểm gốc 0:0 = tâm dự án; offset tính bằng mét (x: đông +, y: bắc +)
  const anchorRef = useRef([project.center_lng ?? 105.526, project.center_lat ?? 21.008]);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hasOverlay, setHasOverlay] = useState(!!project.overlay_path);

  const M_LAT = 111320;
  function centerFromOffset(x, y) {
    const [aLng, aLat] = anchorRef.current;
    const lat = aLat + y / M_LAT;
    const lng = aLng + x / (M_LAT * Math.cos((aLat * Math.PI) / 180));
    return [lng, lat];
  }
  function offsetFromCenter([lng, lat]) {
    const [aLng, aLat] = anchorRef.current;
    return {
      x: Math.round((lng - aLng) * M_LAT * Math.cos((aLat * Math.PI) / 180)),
      y: Math.round((lat - aLat) * M_LAT),
    };
  }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Vẽ/cập nhật ảnh. Di chuyển/đổi cỡ -> dời tại chỗ (không tải lại, không nháy).
  // Chỉ tải lại khi đổi sang ảnh khác.
  function refresh() {
    const map = mapRef.current;
    const url = imgUrlRef.current;
    if (!map || !url) return;
    const coords = rectCoords(centerRef.current, widthRef.current, aspectRef.current);
    const src = map.getSource('overlay');

    if (src && drawnUrlRef.current === url) {
      src.setCoordinates(coords); // chỉ dời, giữ nguyên ảnh
    } else {
      if (map.getLayer('overlay-layer')) map.removeLayer('overlay-layer');
      if (map.getSource('overlay')) map.removeSource('overlay');
      map.addSource('overlay', { type: 'image', url, coordinates: coords });
      map.addLayer({ id: 'overlay-layer', type: 'raster', source: 'overlay', paint: { 'raster-opacity': opacity } });
      drawnUrlRef.current = url;
    }

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
        setOffset(offsetFromCenter([ll.lng, ll.lat])); // đồng bộ ô dịch chuyển
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
        setOffset(offsetFromCenter(d.center));
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

  // Dịch chuyển theo mét từ tâm dự án (x: đông +, y: bắc +)
  function applyOffset(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const c = centerFromOffset(x, y);
    centerRef.current = c;
    setOffset({ x, y });
    mapRef.current?.panTo(c);
    refresh();
  }

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
      const url = overlayUrl(path);
      imgUrlRef.current = url; // cập nhật ngay cho refresh dùng
      setImgPath(path);
      setImgUrl(url);
      setHasOverlay(true);
      refresh();
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
            <label className="overlay-num">
              Chiều rộng (m)
              <div className="overlay-num-row">
                <input type="range" min="50" max="3000" step="10" value={widthM}
                  onChange={(e) => changeWidth(Number(e.target.value))} />
                <input type="number" min="10" step="1" value={widthM}
                  onChange={(e) => changeWidth(Number(e.target.value) || 0)} />
              </div>
            </label>

            <label className="overlay-num">
              Dịch chuyển từ tâm dự án (m) — gốc 0:0
              <div className="overlay-num-row">
                <span className="overlay-axis">→ Đông</span>
                <input type="number" step="1" value={offset.x}
                  onChange={(e) => applyOffset(Number(e.target.value) || 0, offset.y)} />
                <span className="overlay-axis">↑ Bắc</span>
                <input type="number" step="1" value={offset.y}
                  onChange={(e) => applyOffset(offset.x, Number(e.target.value) || 0)} />
              </div>
            </label>
            <button type="button" className="btn-mini" onClick={() => applyOffset(0, 0)}>
              ↺ Về tâm dự án (0:0)
            </button>

            <label className="overlay-opacity">
              Độ mờ: {Math.round(opacity * 100)}%
              <input type="range" min="0.2" max="1" step="0.05" value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))} />
            </label>
            <p className="form-hint">Nhập số cho chính xác, hoặc kéo dấu ✥ trên bản đồ. Ảnh giữ nguyên tỉ lệ.</p>
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
