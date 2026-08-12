'use client';

import { useEffect, useState } from 'react';
import {
  fetchRentals,
  createRental,
  updateRental,
  deleteRental,
  uploadRentalImages,
  RENTAL_STATUS,
  formatRent,
} from '@/lib/rentals';

const EMPTY = {
  code: '',
  title: '',
  type: '',
  status: 'available',
  rent_price: '',
  deposit: '',
  area: '',
  bedrooms: '',
  bathrooms: '',
  furniture: '',
  direction: '',
  district: '',
  address: '',
  description: '',
  owner_name: '',
  owner_phone: '',
  base_price: '',
  commission: '',
  internal_note: '',
};

const NUM = ['rent_price', 'deposit', 'area', 'bedrooms', 'bathrooms', 'base_price'];

export default function RentalsPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = danh sách, object = form
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);

  async function reload() {
    setLoading(true);
    try {
      const { data } = await fetchRentals();
      setList(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
  }, []);

  function openNew() {
    setForm(EMPTY);
    setImages([]);
    setFiles([]);
    setEditing({});
    setError(null);
  }
  function openEdit(r) {
    const f = { ...EMPTY };
    for (const k of Object.keys(EMPTY)) f[k] = r[k] ?? '';
    setForm(f);
    setImages(r.images || []);
    setFiles([]);
    setEditing(r);
    setError(null);
  }
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  function clean() {
    const v = {};
    for (const [k, val] of Object.entries(form)) {
      if (val === '') {
        v[k] = k === 'status' ? 'available' : null;
        continue;
      }
      v[k] = NUM.includes(k) ? Number(val) : val;
    }
    v.images = images;
    return v;
  }

  async function save() {
    if (!form.code.trim() || !form.title.trim()) {
      setError('Cần nhập tối thiểu Mã tin và Tiêu đề.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const values = clean();
      let id = editing?.id;
      if (id) await updateRental(id, values);
      else {
        const created = await createRental(values);
        id = created.id;
      }
      if (files.length) {
        const urls = await uploadRentalImages(id, files, (a, b) => setProgress(`Đang tải ảnh ${a}/${b}…`));
        setProgress(null);
        const merged = [...(values.images || []), ...urls];
        await updateRental(id, { images: merged });
      }
      await reload();
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function removeImage(url) {
    const next = images.filter((u) => u !== url);
    setImages(next);
    if (editing?.id) {
      try {
        await updateRental(editing.id, { images: next });
      } catch (e) {
        setError(e.message);
      }
    }
  }

  async function remove(r) {
    if (!confirm(`Xóa tin "${r.title}"? Không thể hoàn tác.`)) return;
    setBusy(true);
    try {
      await deleteRental(r);
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const styleTag = (
    <style>{`
      .rform{max-width:820px;}
      .rform .rf-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      .rform label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;}
      .rform input,.rform select,.rform textarea{font:inherit;font-size:14px;font-weight:400;text-transform:none;letter-spacing:normal;color:var(--ink);padding:9px 11px;border:1px solid var(--stone-dark);border-radius:8px;background:#fff;width:100%;}
      .rform textarea{min-height:70px;resize:vertical;}
      .rform .full{grid-column:1 / -1;}
      .rf-section{margin:22px 0 6px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--st-deposited);border-top:1px dashed var(--stone-dark);padding-top:16px;}
      .rf-imgs{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;}
      .rf-img{position:relative;width:96px;height:72px;border-radius:8px;overflow:hidden;border:1px solid var(--stone-dark);}
      .rf-img img{width:100%;height:100%;object-fit:cover;display:block;}
      .rf-img button{position:absolute;top:3px;right:3px;width:20px;height:20px;border:0;border-radius:50%;background:rgba(179,64,47,.92);color:#fff;cursor:pointer;font-size:12px;line-height:1;}
      .rf-actions{display:flex;gap:10px;margin-top:22px;}
      .rf-err{color:#b3402f;font-size:13px;margin-top:10px;}
    `}</style>
  );

  if (loading) return <p className="form-hint">Đang tải…</p>;

  // ---------- FORM ----------
  if (editing) {
    return (
      <div className="rform">
        {styleTag}
        <div className="rf-grid">
          <label>
            Mã tin *<input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="VD: THUE-001" />
          </label>
          <label>
            Trạng thái
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(RENTAL_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            Tiêu đề *
            <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="VD: Cho thuê căn hộ 2PN full nội thất" />
          </label>
          <label>
            Loại hình
            <input value={form.type} onChange={(e) => set('type', e.target.value)} placeholder="Căn hộ / Nhà / Shophouse" />
          </label>
          <label>
            Khu vực (hiển thị khách)
            <input value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="VD: Hòa Lạc" />
          </label>
          <label>
            Giá thuê / tháng (VND)
            <input type="number" value={form.rent_price} onChange={(e) => set('rent_price', e.target.value)} placeholder="VD: 8000000" />
          </label>
          <label>
            Đặt cọc (VND)
            <input type="number" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} />
          </label>
          <label>
            Diện tích (m²)
            <input type="number" value={form.area} onChange={(e) => set('area', e.target.value)} />
          </label>
          <label>
            Nội thất
            <input value={form.furniture} onChange={(e) => set('furniture', e.target.value)} placeholder="Đầy đủ / Cơ bản / Trống" />
          </label>
          <label>
            Số phòng ngủ
            <input type="number" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
          </label>
          <label>
            Số WC
            <input type="number" value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
          </label>
          <label>
            Hướng
            <input value={form.direction} onChange={(e) => set('direction', e.target.value)} />
          </label>
          <label className="full">
            Địa chỉ (chỉ hiện khi đăng nhập)
            <input value={form.address} onChange={(e) => set('address', e.target.value)} />
          </label>
          <label className="full">
            Mô tả công khai
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
        </div>

        <div className="full">
          <div className="rf-section">Ảnh</div>
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
          {progress && <p className="form-hint">{progress}</p>}
          <div className="rf-imgs">
            {images.map((url) => (
              <div className="rf-img" key={url}>
                <img src={url} alt="" />
                <button type="button" onClick={() => removeImage(url)} title="Xóa ảnh">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rf-section">Thông tin nội bộ (chỉ nhân viên thấy)</div>
        <div className="rf-grid">
          <label>
            Tên chủ nhà
            <input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
          </label>
          <label>
            Liên hệ chủ nhà
            <input value={form.owner_phone} onChange={(e) => set('owner_phone', e.target.value)} />
          </label>
          <label>
            Giá gốc chủ nhà (VND)
            <input type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} />
          </label>
          <label>
            Hoa hồng / phí
            <input value={form.commission} onChange={(e) => set('commission', e.target.value)} />
          </label>
          <label className="full">
            Ghi chú nội bộ
            <textarea value={form.internal_note} onChange={(e) => set('internal_note', e.target.value)} />
          </label>
        </div>

        {error && <p className="rf-err">{error}</p>}
        <div className="rf-actions">
          <button className="btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Đang lưu…' : editing?.id ? 'Lưu thay đổi' : 'Tạo tin'}
          </button>
          <button className="btn-logout" onClick={() => setEditing(null)} disabled={busy} style={{ color: 'var(--ink)', borderColor: 'var(--stone-dark)' }}>
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // ---------- DANH SÁCH ----------
  return (
    <div>
      <div className="rpanel-toolbar">
        <p className="form-hint" style={{ margin: 0 }}>
          {list.length} tin cho thuê
        </p>
        <button className="btn-add" onClick={openNew} style={{ color: '#fff', background: 'var(--moss)', borderColor: 'var(--moss)' }}>
          + Thêm tin cho thuê
        </button>
      </div>
      {error && <p className="rf-err" style={{ color: '#b3402f' }}>{error}</p>}
      {list.length === 0 ? (
        <p className="form-hint">Chưa có tin cho thuê. Bấm "Thêm tin cho thuê" để tạo mới.</p>
      ) : (
        <div className="rpanel-list">
          {list.map((r) => {
            const st = RENTAL_STATUS[r.status] || { label: r.status, color: '#8b877c' };
            return (
              <div className="rpanel-row" key={r.id}>
                {r.images && r.images[0] ? <img src={r.images[0]} alt="" /> : <div className="rpanel-noimg">Chưa ảnh</div>}
                <div className="rp-main">
                  <div className="rp-title">{r.title}</div>
                  <div className="rp-sub">
                    {r.code} · {formatRent(r.rent_price)}/tháng
                    {r.area ? ` · ${r.area} m²` : ''}
                    {r.district ? ` · ${r.district}` : ''}
                  </div>
                </div>
                <span className="rpanel-badge" style={{ background: st.color }}>
                  {st.label}
                </span>
                <div className="rp-actions">
                  <button className="btn-logout" onClick={() => openEdit(r)} style={{ color: 'var(--ink)', borderColor: 'var(--stone-dark)' }}>
                    Sửa
                  </button>
                  <button className="btn-logout" onClick={() => remove(r)} disabled={busy} style={{ color: '#b3402f', borderColor: '#e0b3ab' }}>
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
