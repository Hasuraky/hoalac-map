'use client';

import { useEffect, useState } from 'react';

// Quản lý dự án (admin/owner)
export default function ProjectsPanel() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code_prefix: '',
    coords: '', // "lat, lng" dán từ Google Maps
    is_featured: false,
  });

  async function load() {
    setError(null);
    const res = await fetch('/api/admin/projects');
    const json = await res.json();
    if (!res.ok) { setError(json.error); setProjects([]); }
    else setProjects(json.projects);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function parseCoords(s) {
    const m = (s || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
  }

  async function createProject(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    const c = parseCoords(form.coords);
    const res = await fetch('/api/admin/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        code_prefix: form.code_prefix,
        center_lat: c?.lat ?? null,
        center_lng: c?.lng ?? null,
        is_featured: form.is_featured,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error); return; }
    setForm({ name: '', code_prefix: '', coords: '', is_featured: false });
    load();
  }

  async function patch(id, payload) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  async function remove(p) {
    if (!window.confirm(`Xóa dự án "${p.name}"? Các BĐS trong dự án sẽ thành BĐS lẻ.`)) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  if (loading) return <p className="form-hint">Đang tải…</p>;

  return (
    <>
      {error && <div className="login-error">{error}</div>}

      <div className="detail-card admin-card">
        <h2 className="section-title">Thêm dự án</h2>
        <form className="admin-form" onSubmit={createProject}>
          <label>Tên dự án *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Xanh Villas" required />
          </label>
          <label>Mã rút gọn (dùng trong mã BĐS)
            <input value={form.code_prefix} onChange={(e) => setForm({ ...form, code_prefix: e.target.value })} placeholder="XanhVillas (để trống = tự tạo từ tên)" />
          </label>
          <label className="span-2">Tọa độ tâm dự án (dán từ Google Maps)
            <input value={form.coords} onChange={(e) => setForm({ ...form, coords: e.target.value })} placeholder="21.00812, 105.52643" />
          </label>
          <label className="check-inline">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            Dự án nổi bật (hiện ở bộ lọc bản đồ)
          </label>
          <button type="submit" className="btn-primary btn-inline" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Thêm dự án'}
          </button>
        </form>
      </div>

      <div className="detail-card admin-card">
        <h2 className="section-title">Dự án ({projects.length})</h2>
        <div className="admin-table">
          {projects.map((p) => (
            <div className="admin-row" key={p.id}>
              <div className="admin-user">
                <strong>{p.name}</strong>
                <span className="admin-meta">
                  Mã: HL-{p.code_prefix}-…
                  {p.center_lat ? ` · ${p.center_lat.toFixed(4)}, ${p.center_lng.toFixed(4)}` : ' · chưa có tọa độ'}
                </span>
              </div>
              <div className="admin-actions">
                <button
                  type="button"
                  className={`btn-mini${p.is_featured ? ' star-on' : ''}`}
                  disabled={busy}
                  onClick={() => patch(p.id, { is_featured: !p.is_featured })}
                >
                  {p.is_featured ? '★ Nổi bật' : '☆ Nổi bật'}
                </button>
                <button type="button" className="btn-mini danger" disabled={busy} onClick={() => remove(p)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
