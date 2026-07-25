'use client';

import { useEffect, useRef, useState } from 'react';
import goongjs from '@goongmaps/goong-js';
import '@goongmaps/goong-js/dist/goong-js.css';
import { landmarkUrl, uploadLandmark } from '@/lib/landmarks';

const MAPTILES_KEY = process.env.NEXT_PUBLIC_GOONG_MAPTILES_KEY;
const HOA_LAC = [105.526, 21.008];

export default function LandmarksPanel() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState(null); // [lng, lat]
  const [name, setName] = useState('');
  const [width, setWidth] = useState(90);
  const [imgPath, setImgPath] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [editingId, setEditingId] = useState(null); // null = thêm mới

  async function load() {
    const res = await fetch('/api/admin/landmarks');
    const json = await res.json();
    if (!res.ok) setError(json.error);
    else setItems(json.landmarks);
  }
  useEffect(() => { load(); }, []);

  // Mini-map chấm vị trí
  useEffect(() => {
    if (!MAPTILES_KEY || mapRef.current || !mapEl.current) return;
    goongjs.accessToken = MAPTILES_KEY;
    const map = new goongjs.Map({
      container: mapEl.current,
      style: 'https://tiles.goong.io/assets/goong_map_web.json',
      center: HOA_LAC,
      zoom: 13,
    });
    map.addControl(new goongjs.NavigationControl(), 'top-left');
    map.on('click', (e) => setPos([e.lngLat.lng, e.lngLat.lat]));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Ghim marker tạm khi chọn vị trí
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pos) return;
    markerRef.current?.remove();
    const el = document.createElement('div');
    el.className = 'overlay-center-handle';
    el.textContent = '📍';
    markerRef.current = new goongjs.Marker({ element: el }).setLngLat(pos).addTo(map);
  }, [pos]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const path = await uploadLandmark(file);
      setImgPath(path);
      setImgUrl(landmarkUrl(path));
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  function pasteCoords(v) {
    const m = v.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (m) {
      const p = [Number(m[2]), Number(m[1])];
      setPos(p);
      mapRef.current?.flyTo({ center: p, zoom: 15 });
    }
  }

  function resetForm() {
    setName(''); setPos(null); setImgPath(null); setImgUrl(null); setWidth(90); setEditingId(null);
    markerRef.current?.remove(); markerRef.current = null;
  }

  function startEdit(it) {
    setEditingId(it.id);
    setName(it.name || '');
    setWidth(it.width_px || 90);
    setImgPath(it.image_path);
    setImgUrl(landmarkUrl(it.image_path));
    setPos([it.lng, it.lat]);
    mapRef.current?.flyTo({ center: [it.lng, it.lat], zoom: 15 });
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  }

  async function save() {
    if (!pos || !imgPath) { setError('Cần chọn vị trí và ảnh.'); return; }
    setBusy(true); setError(null);
    const body = { name, lat: pos[1], lng: pos[0], image_path: imgPath, width_px: width };
    const res = editingId
      ? await fetch(`/api/admin/landmarks/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/admin/landmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error); return; }
    resetForm();
    load();
  }

  async function remove(it) {
    if (!window.confirm('Xóa điểm nổi bật này?')) return;
    setBusy(true);
    await fetch(`/api/admin/landmarks/${it.id}`, { method: 'DELETE' });
    setBusy(false);
    load();
  }

  return (
    <>
      {error && <div className="login-error">{error}</div>}

      <div className="detail-card admin-card">
        <h2 className="section-title">{editingId ? 'Sửa điểm nổi bật' : 'Thêm điểm nổi bật'}</h2>
        <div ref={mapEl} className="landmark-map" />
        <p className="form-hint">Bấm lên bản đồ để chọn vị trí, hoặc dán tọa độ Google Maps bên dưới.</p>

        <div className="admin-form" style={{ marginTop: 10 }}>
          <label>Tên (không bắt buộc)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ĐH FPT" />
          </label>
          <label>Dán tọa độ
            <input onChange={(e) => pasteCoords(e.target.value)} placeholder="21.0125, 105.5254" />
          </label>
          <label className="span-2">Ảnh (PNG nền trong suốt đẹp nhất)
            <input type="file" accept="image/*" onChange={handleFile} disabled={busy} />
          </label>
          <label className="overlay-num span-2">Cỡ hiển thị: {width}px
            <input type="range" min="40" max="200" step="5" value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
        </div>

        {imgUrl && <img src={imgUrl} alt="" style={{ width, marginTop: 8 }} />}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className="btn-primary btn-inline" disabled={busy} onClick={save}>
            {editingId ? 'Lưu thay đổi' : 'Thêm điểm'}
          </button>
          {editingId && (
            <button className="btn-secondary" disabled={busy} onClick={resetForm}>Hủy</button>
          )}
        </div>
      </div>

      <div className="detail-card admin-card">
        <h2 className="section-title">Điểm nổi bật ({items.length})</h2>
        <div className="admin-table">
          {items.map((it) => (
            <div className="admin-row" key={it.id}>
              <img src={landmarkUrl(it.image_path)} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <div className="admin-user">
                <strong>{it.name || '(không tên)'}</strong>
                <span className="admin-meta">{it.lat.toFixed(4)}, {it.lng.toFixed(4)} · {it.width_px}px</span>
              </div>
              <div className="admin-actions">
                <button className="btn-mini" disabled={busy} onClick={() => startEdit(it)}>✎ Sửa</button>
                <button className="btn-mini danger" disabled={busy} onClick={() => remove(it)}>Xóa</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="form-hint">Chưa có điểm nổi bật nào.</p>}
        </div>
      </div>
    </>
  );
}
