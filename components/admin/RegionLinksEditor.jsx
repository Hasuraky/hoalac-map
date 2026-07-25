'use client';

import { useEffect, useState } from 'react';

// Quản lý liên kết vùng (mũi tên). Truyền projectId HOẶC propertyId.
export default function RegionLinksEditor({ projectId, propertyId }) {
  const [links, setLinks] = useState([]);
  const [coords, setCoords] = useState('');
  const [label, setLabel] = useState('');
  const [curve, setCurve] = useState(0); // -100..100, 0 = thẳng
  const [editingId, setEditingId] = useState(null); // id mũi tên đang sửa
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const query = projectId ? `project=${projectId}` : `property=${propertyId}`;

  async function load() {
    const res = await fetch(`/api/admin/region-links?${query}`);
    const json = await res.json();
    if (res.ok) setLinks(json.links);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId, propertyId]);

  function resetForm() {
    setCoords(''); setLabel(''); setCurve(0); setEditingId(null); setError(null);
  }

  function startEdit(l) {
    setEditingId(l.id);
    setCoords(`${l.to_lat}, ${l.to_lng}`);
    setLabel(l.label || '');
    setCurve(Math.round((l.curve || 0) * 100));
    setError(null);
  }

  async function submit() {
    const m = coords.match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (!m) { setError('Dán tọa độ điểm đích (lat, lng).'); return; }
    setBusy(true); setError(null);
    const body = { to_lat: Number(m[1]), to_lng: Number(m[2]), label, curve: curve / 100 };
    const res = editingId
      ? await fetch(`/api/admin/region-links/${editingId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      : await fetch('/api/admin/region-links', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId ?? null, property_id: propertyId ?? null, ...body }),
        });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error); return; }
    resetForm(); load();
  }

  async function remove(id) {
    setBusy(true);
    await fetch(`/api/admin/region-links/${id}`, { method: 'DELETE' });
    setBusy(false);
    if (editingId === id) resetForm();
    load();
  }

  return (
    <div className="rlink-editor">
      <h2 className="section-title">Liên kết vùng ({links.length})</h2>
      <p className="form-hint">Mũi tên chỉ từ sản phẩm tới điểm đích, hiện khi khách bấm “Liên kết vùng” trong popup.</p>

      <div className="rlink-add">
        <input value={coords} onChange={(e) => setCoords(e.target.value)} placeholder="Tọa độ đích: 21.0125, 105.5254" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nội dung: 2 km · 5 phút tới ĐH FPT" />
        <div className="rlink-curve">
          <label>Độ cong: <b>{curve === 0 ? 'thẳng' : (curve > 0 ? `cong lên ${curve}` : `cong xuống ${Math.abs(curve)}`)}</b></label>
          <input type="range" min={-100} max={100} step={5} value={curve} onChange={(e) => setCurve(Number(e.target.value))} />
        </div>
        <div className="rlink-actions">
          <button className="btn-mini" disabled={busy} onClick={submit}>{editingId ? 'Lưu' : '+ Thêm'}</button>
          {editingId && <button className="btn-mini ghost" disabled={busy} onClick={resetForm}>Hủy</button>}
        </div>
      </div>
      {error && <div className="login-error">{error}</div>}

      <div className="admin-table" style={{ marginTop: 8 }}>
        {links.map((l) => (
          <div className={`admin-row${editingId === l.id ? ' editing' : ''}`} key={l.id}>
            <div className="admin-user">
              <strong>{l.label || '(không nhãn)'}</strong>
              <span className="admin-meta">→ {l.to_lat.toFixed(4)}, {l.to_lng.toFixed(4)}{l.curve ? ` · ${l.curve > 0 ? 'cong lên' : 'cong xuống'} ${Math.abs(Math.round(l.curve * 100))}` : ''}</span>
            </div>
            <div className="rlink-row-actions">
              <button className="btn-mini" disabled={busy} onClick={() => startEdit(l)}>Sửa</button>
              <button className="btn-mini danger" disabled={busy} onClick={() => remove(l.id)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
