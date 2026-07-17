'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { STATUS_LABELS } from '@/lib/format';
import {
  fetchProperties,
  createProperty,
  updateProperty,
  findNearbyProperties,
} from '@/lib/properties';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="location-picker-map map-loading">Đang tải bản đồ…</div>,
});

const TYPES = ['Đất nền', 'Nhà ở', 'Shophouse', 'Biệt thự', 'Khác'];
const DIRECTIONS = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông Bắc', 'Đông Nam', 'Tây Bắc', 'Tây Nam'];

// property = null -> thêm mới; có property -> sửa
export default function PropertyForm({ property = null }) {
  const router = useRouter();
  const isEdit = !!property;

  const [form, setForm] = useState({
    code: property?.code ?? '',
    title: property?.title ?? '',
    type: property?.type ?? 'Đất nền',
    status: property?.status ?? 'available',
    priceTy: property?.price != null ? property.price / 1e9 : '',
    area: property?.area ?? '',
    frontage: property?.frontage ?? '',
    road_width: property?.road_width ?? '',
    direction: property?.direction ?? '',
    legal: property?.legal ?? '',
    address: property?.address ?? '',
    description: property?.description ?? '',
    lat: property?.lat ?? null,
    lng: property?.lng ?? null,
  });
  const [allProperties, setAllProperties] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  // Tải danh sách để kiểm tra trùng lặp
  useEffect(() => {
    fetchProperties()
      .then(({ data }) => setAllProperties(data))
      .catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // BĐS gần vị trí đã chấm (< 40m) -> nghi trùng
  const nearby = useMemo(
    () => findNearbyProperties(allProperties, form.lat, form.lng, property?.id),
    [allProperties, form.lat, form.lng, property?.id]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.lat == null || form.lng == null) {
      setError('Chưa chấm vị trí trên bản đồ — bấm vào bản đồ để đặt ghim.');
      return;
    }
    if (nearby.length > 0 && !confirmDuplicate) {
      setError('Có BĐS ngay gần vị trí này (xem cảnh báo bên dưới bản đồ). Tick xác nhận nếu chắc chắn không trùng.');
      return;
    }

    const values = {
      code: form.code.trim(),
      title: form.title.trim(),
      type: form.type || null,
      status: form.status,
      price: form.priceTy === '' ? null : Math.round(Number(form.priceTy) * 1e9),
      area: form.area === '' ? null : Number(form.area),
      frontage: form.frontage === '' ? null : Number(form.frontage),
      road_width: form.road_width === '' ? null : Number(form.road_width),
      direction: form.direction || null,
      legal: form.legal.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      lat: form.lat,
      lng: form.lng,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateProperty(property.id, values);
        router.push(`/bds/${property.id}`);
      } else {
        const created = await createProperty(values);
        router.push(`/bds/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (!supabase) {
    return (
      <div className="form-notice">
        Đang chạy chế độ demo (chưa cấu hình Supabase) — không thể thêm/sửa BĐS.
      </div>
    );
  }

  return (
    <form className="property-form" onSubmit={handleSubmit}>
      {/* Vị trí */}
      <section>
        <h2 className="section-title">Vị trí trên bản đồ *</h2>
        <p className="form-hint">
          Bấm vào bản đồ để đặt ghim, kéo ghim để tinh chỉnh.
          {form.lat != null && ` Đã chấm: ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`}
        </p>
        <LocationPicker
          lat={form.lat}
          lng={form.lng}
          onPick={(lat, lng) => {
            setForm((f) => ({ ...f, lat, lng }));
            setConfirmDuplicate(false);
          }}
        />

        {nearby.length > 0 && (
          <div className="dup-warning">
            <strong>⚠ Cảnh báo trùng lặp:</strong> có {nearby.length} BĐS trong bán kính 40m:
            <ul>
              {nearby.slice(0, 3).map((p) => (
                <li key={p.id}>
                  <a href={`/bds/${p.id}`} target="_blank" rel="noreferrer">
                    {p.code} — {p.title}
                  </a>{' '}
                  (cách {Math.round(p._distance)}m, {STATUS_LABELS[p.status] ?? p.status})
                </li>
              ))}
            </ul>
            <label className="dup-confirm">
              <input
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
              />
              Tôi đã kiểm tra — đây là BĐS khác, không phải nhập trùng
            </label>
          </div>
        )}
      </section>

      {/* Thông tin chính */}
      <section>
        <h2 className="section-title">Thông tin chính</h2>
        <div className="form-grid">
          <label>
            Mã BĐS *
            <input value={form.code} onChange={set('code')} required placeholder="HL-007" />
          </label>
          <label>
            Trạng thái *
            <select value={form.status} onChange={set('status')}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Tiêu đề *
            <input
              value={form.title}
              onChange={set('title')}
              required
              placeholder="Đất nền 100m2 gần Đại học FPT"
            />
          </label>
          <label>
            Loại hình
            <select value={form.type} onChange={set('type')}>
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Giá (tỷ VND)
            <input
              type="number"
              step="0.05"
              min="0"
              value={form.priceTy}
              onChange={set('priceTy')}
              placeholder="3.2"
            />
          </label>
          <label>
            Diện tích (m²)
            <input type="number" step="0.1" min="0" value={form.area} onChange={set('area')} placeholder="100" />
          </label>
          <label>
            Mặt tiền (m)
            <input type="number" step="0.1" min="0" value={form.frontage} onChange={set('frontage')} placeholder="5" />
          </label>
          <label>
            Đường trước nhà (m)
            <input type="number" step="0.1" min="0" value={form.road_width} onChange={set('road_width')} placeholder="8" />
          </label>
          <label>
            Hướng
            <select value={form.direction} onChange={set('direction')}>
              <option value="">— Chọn —</option>
              {DIRECTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Pháp lý
            <input value={form.legal} onChange={set('legal')} placeholder="Sổ đỏ" />
          </label>
          <label className="span-2">
            Địa chỉ
            <input value={form.address} onChange={set('address')} placeholder="Thạch Hòa, Thạch Thất, Hà Nội" />
          </label>
          <label className="span-2">
            Mô tả
            <textarea
              rows={4}
              value={form.description}
              onChange={set('description')}
              placeholder="Lô góc, đường ô tô tránh nhau..."
            />
          </label>
        </div>
      </section>

      {error && <div className="login-error">{error}</div>}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={() => router.back()} disabled={saving}>
          Hủy
        </button>
        <button type="submit" className="btn-primary btn-inline" disabled={saving}>
          {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Thêm BĐS'}
        </button>
      </div>
    </form>
  );
}
