'use client';

import { useEffect, useState } from 'react';
import { fetchProperties } from '@/lib/properties';
import { fetchProjects, overlayUrl } from '@/lib/projects';
import { parseSvgLots } from '@/lib/svgLots';
import { STATUS_LABELS, formatPrice } from '@/lib/format';

// Quản lý toàn bộ bảng hàng: dự án + sản phẩm lẻ. Xem chi tiết dự án.
export default function InventoryPanel() {
  const [projects, setProjects] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null); // project đang xem chi tiết
  const [lotIds, setLotIds] = useState([]); // id lô trong SVG của dự án đang xem
  const [editing, setEditing] = useState(false);

  // Form thêm dự án
  const [form, setForm] = useState({ name: '', code_prefix: '', coords: '', is_featured: false });
  // Form sửa dự án
  const [edit, setEdit] = useState({ name: '', code_prefix: '', coords: '', is_featured: false });

  async function load() {
    setError(null);
    const [pjRes, propRes] = await Promise.all([
      fetch('/api/admin/projects').then((r) => r.json()),
      fetchProperties().catch(() => ({ data: [] })),
    ]);
    if (pjRes.error) setError(pjRes.error);
    else setProjects(pjRes.projects);
    setProperties(propRes.data ?? []);
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
      body: JSON.stringify({ name: form.name, code_prefix: form.code_prefix, center_lat: c?.lat ?? null, center_lng: c?.lng ?? null, is_featured: form.is_featured }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error); return; }
    setForm({ name: '', code_prefix: '', coords: '', is_featured: false });
    load();
  }

  async function patchProject(id, payload) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    await load();
    return res.ok;
  }

  async function removeProject(p) {
    if (!window.confirm(`Xóa dự án "${p.name}"? Các BĐS trong dự án sẽ thành sản phẩm lẻ.`)) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/projects/${p.id}`, { method: 'DELETE' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  // Mở chi tiết dự án -> đọc lô từ SVG (để biết lô nào chưa có thông tin)
  async function openDetail(p) {
    setSelected(p);
    setEditing(false);
    setLotIds([]);
    if (p.overlay_path && p.overlay_path.toLowerCase().endsWith('.svg') && p.overlay_coords) {
      const lots = await parseSvgLots(overlayUrl(p.overlay_path), p.overlay_coords);
      setLotIds(lots.map((l) => l.lot_number));
    }
  }

  function startEdit(p) {
    setEdit({
      name: p.name,
      code_prefix: p.code_prefix,
      coords: p.center_lat != null ? `${p.center_lat}, ${p.center_lng}` : '',
      is_featured: p.is_featured,
    });
    setEditing(true);
  }

  async function saveEdit() {
    const c = parseCoords(edit.coords);
    const ok = await patchProject(selected.id, {
      name: edit.name, code_prefix: edit.code_prefix,
      center_lat: c?.lat ?? null, center_lng: c?.lng ?? null, is_featured: edit.is_featured,
    });
    if (ok) {
      setEditing(false);
      // cập nhật selected từ danh sách mới
      const fresh = (await fetch('/api/admin/projects').then((r) => r.json())).projects?.find((x) => x.id === selected.id);
      if (fresh) setSelected(fresh);
    }
  }

  if (loading) return <p className="form-hint">Đang tải…</p>;

  // ===== CHI TIẾT DỰ ÁN =====
  if (selected) {
    const inProject = properties.filter((p) => p.project_id === selected.id);
    const assignedLots = new Set(inProject.map((p) => p.lot_number).filter(Boolean));
    const emptyLots = lotIds.filter((id) => !assignedLots.has(id));

    return (
      <>
        {error && <div className="login-error">{error}</div>}
        <button type="button" className="back" onClick={() => setSelected(null)}>← Về bảng hàng</button>

        <div className="detail-card admin-card">
          <div className="lead-head">
            <h2 className="section-title" style={{ margin: 0 }}>{selected.name}</h2>
            <div className="admin-actions">
              <button className="btn-mini" onClick={() => (editing ? setEditing(false) : startEdit(selected))}>
                {editing ? 'Hủy' : '✎ Sửa'}
              </button>
              <a className="btn-mini" href={selected.center_lat == null ? undefined : `/du-an/${selected.id}/so-do`}
                style={selected.center_lat == null ? { opacity: 0.4, pointerEvents: 'none' } : {}}>🗺️ Sơ đồ{selected.overlay_path ? ' ✓' : ''}</a>
            </div>
          </div>

          {editing ? (
            <div className="admin-form" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <label>Tên dự án<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
              <label>Mã rút gọn<input value={edit.code_prefix} onChange={(e) => setEdit({ ...edit, code_prefix: e.target.value })} /></label>
              <label className="span-2">Tọa độ tâm<input value={edit.coords} onChange={(e) => setEdit({ ...edit, coords: e.target.value })} placeholder="21.008, 105.526" /></label>
              <label className="check-inline"><input type="checkbox" checked={edit.is_featured} onChange={(e) => setEdit({ ...edit, is_featured: e.target.checked })} /> Nổi bật</label>
              <button className="btn-primary btn-inline" disabled={busy} onClick={saveEdit}>Lưu</button>
            </div>
          ) : (
            <p className="admin-meta">
              Mã: HL-{selected.code_prefix}-… · {selected.is_featured ? '★ Nổi bật' : 'Thường'}
              {selected.center_lat != null ? ` · ${selected.center_lat.toFixed(4)}, ${selected.center_lng.toFixed(4)}` : ' · chưa có tọa độ'}
            </p>
          )}
        </div>

        {/* Sản phẩm đã có thông tin */}
        <div className="detail-card admin-card">
          <div className="lead-head">
            <h2 className="section-title" style={{ margin: 0 }}>Sản phẩm ({inProject.length})</h2>
            <a className="btn-mini" href={`/bds/moi?project=${selected.id}`}>+ Thêm</a>
          </div>
          <div className="admin-table">
            {inProject.map((p) => (
              <div className="admin-row" key={p.id}>
                <div className="admin-user">
                  <strong>{p.lot_number ? `Lô ${p.lot_number}` : p.code}</strong>
                  <span className="admin-meta">{p.title} · {formatPrice(p.price)}</span>
                </div>
                <span className={`role-badge lead-status-${p.status === 'available' ? 'converted' : 'assigned'}`}>{STATUS_LABELS[p.status]}</span>
                <a className="btn-mini" href={`/bds/${p.id}/sua`}>✎ Sửa</a>
              </div>
            ))}
            {inProject.length === 0 && <p className="form-hint">Chưa có sản phẩm nào.</p>}
          </div>
        </div>

        {/* Lô có trong SVG nhưng chưa đánh thông tin */}
        {emptyLots.length > 0 && (
          <div className="detail-card admin-card">
            <h2 className="section-title">Lô chưa có thông tin ({emptyLots.length})</h2>
            <div className="admin-table">
              {emptyLots.map((id) => (
                <div className="admin-row" key={id}>
                  <div className="admin-user"><strong>Lô {id}</strong><span className="admin-meta">chưa đánh thông tin</span></div>
                  <a className="btn-mini" href={`/bds/moi?project=${selected.id}&lot=${encodeURIComponent(id)}`}>+ Thêm thông tin</a>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // ===== DANH SÁCH BẢNG HÀNG =====
  const standalone = properties.filter((p) => !p.project_id);

  return (
    <>
      {error && <div className="login-error">{error}</div>}

      <div className="detail-card admin-card">
        <h2 className="section-title">Thêm dự án</h2>
        <form className="admin-form" onSubmit={createProject}>
          <label>Tên dự án *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Xanh Villas" required /></label>
          <label>Mã rút gọn<input value={form.code_prefix} onChange={(e) => setForm({ ...form, code_prefix: e.target.value })} placeholder="XanhVillas (để trống = tự tạo)" /></label>
          <label className="span-2">Tọa độ tâm (dán Google Maps)<input value={form.coords} onChange={(e) => setForm({ ...form, coords: e.target.value })} placeholder="21.00812, 105.52643" /></label>
          <label className="check-inline"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Dự án nổi bật</label>
          <button type="submit" className="btn-primary btn-inline" disabled={busy}>{busy ? 'Đang lưu…' : 'Thêm dự án'}</button>
        </form>
      </div>

      <div className="detail-card admin-card">
        <h2 className="section-title">Dự án ({projects.length})</h2>
        <div className="admin-table">
          {projects.map((p) => {
            const count = properties.filter((x) => x.project_id === p.id).length;
            return (
              <div className="admin-row" key={p.id}>
                <div className="admin-user">
                  <strong>{p.name}</strong>
                  <span className="admin-meta">{count} sản phẩm · {p.overlay_path ? 'có sơ đồ' : 'chưa có sơ đồ'}</span>
                </div>
                <div className="admin-actions">
                  <button className="btn-mini" onClick={() => openDetail(p)}>Xem chi tiết</button>
                  <button className={`btn-mini${p.is_featured ? ' star-on' : ''}`} disabled={busy} onClick={() => patchProject(p.id, { is_featured: !p.is_featured })}>{p.is_featured ? '★' : '☆'}</button>
                  <button className="btn-mini danger" disabled={busy} onClick={() => removeProject(p)}>Xóa</button>
                </div>
              </div>
            );
          })}
          {projects.length === 0 && <p className="form-hint">Chưa có dự án nào.</p>}
        </div>
      </div>

      <div className="detail-card admin-card">
        <div className="lead-head">
          <h2 className="section-title" style={{ margin: 0 }}>Sản phẩm lẻ ({standalone.length})</h2>
          <a className="btn-mini" href="/bds/moi">+ Thêm</a>
        </div>
        <div className="admin-table">
          {standalone.map((p) => (
            <div className="admin-row" key={p.id}>
              <div className="admin-user">
                <strong>{p.code}</strong>
                <span className="admin-meta">{p.title} · {formatPrice(p.price)}</span>
              </div>
              <span className={`role-badge lead-status-${p.status === 'available' ? 'converted' : 'assigned'}`}>{STATUS_LABELS[p.status]}</span>
              <a className="btn-mini" href={`/bds/${p.id}/sua`}>✎ Sửa</a>
            </div>
          ))}
          {standalone.length === 0 && <p className="form-hint">Chưa có sản phẩm lẻ nào.</p>}
        </div>
      </div>
    </>
  );
}
