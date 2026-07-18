'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ImageManager from '@/components/ImageManager';
import { STATUS_LABELS, PROPERTY_TYPES } from '@/lib/format';
import {
  fetchProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  findNearbyProperties,
  fetchRole,
} from '@/lib/properties';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => <div className="location-picker-map map-loading">Đang tải bản đồ…</div>,
});

const TYPES = PROPERTY_TYPES;
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
  const [gmapsInput, setGmapsInput] = useState('');
  const [gmapsError, setGmapsError] = useState(null);
  const [locating, setLocating] = useState(false);

  // Đọc tọa độ từ link Google Maps hoặc chuỗi "lat, lng"
  function parseGoogleMaps(text) {
    const s = text.trim();
    // Link đầy đủ: .../@21.008,105.526,17z hoặc ...?q=21.008,105.526
    const at = s.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (at) return [Number(at[1]), Number(at[2])];
    const q = s.match(/[?&](?:q|query|ll|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
    if (q) return [Number(q[1]), Number(q[2])];
    // Chuỗi tọa độ thuần: "21.008, 105.526" (Google Maps: chuột phải > copy tọa độ)
    const plain = s.match(/^(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
    if (plain) return [Number(plain[1]), Number(plain[2])];
    return null;
  }

  function applyGmaps() {
    setGmapsError(null);
    const coords = parseGoogleMaps(gmapsInput);
    if (!coords) {
      setGmapsError(
        'Không đọc được tọa độ. Trên Google Maps: nhấn giữ (mobile) hoặc chuột phải (máy tính) vào vị trí → bấm dòng tọa độ để copy → dán vào đây. Link rút gọn maps.app.goo.gl không dùng được — hãy copy tọa độ.'
      );
      return;
    }
    setForm((f) => ({ ...f, lat: coords[0], lng: coords[1] }));
    setConfirmDuplicate(false);
  }

  // Lấy vị trí GPS hiện tại (đi thực địa, đứng tại lô đất)
  function useMyLocation() {
    if (!navigator.geolocation) {
      setGmapsError('Trình duyệt không hỗ trợ định vị.');
      return;
    }
    setLocating(true);
    setGmapsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setConfirmDuplicate(false);
        setLocating(false);
      },
      () => {
        setGmapsError('Không lấy được vị trí — kiểm tra quyền truy cập vị trí của trình duyệt.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const [role, setRole] = useState(null);

  // Tải danh sách để kiểm tra trùng lặp + cấp tài khoản
  useEffect(() => {
    fetchProperties()
      .then(({ data }) => setAllProperties(data))
      .catch(() => {});
    fetchRole().then(setRole);
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // BĐS gần vị trí đã chấm (< 40m) -> nghi trùng
  const nearby = useMemo(
    () => findNearbyProperties(allProperties, form.lat, form.lng, property?.id),
    [allProperties, form.lat, form.lng, property?.id]
  );

  // Mã tự sinh: HL-{diện tích}-{số thứ tự 5 chữ số}, ví dụ HL-120-00002
  const nextSeq = useMemo(() => {
    let max = 0;
    for (const p of allProperties) {
      const m = /^HL-\d+-(\d+)$/.exec(p.code ?? '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return max + 1;
  }, [allProperties]);

  const autoCode = isEdit
    ? form.code
    : `HL-${form.area ? Math.round(Number(form.area)) : '?'}-${String(nextSeq).padStart(5, '0')}`;

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
    if (!isEdit && (form.area === '' || Number(form.area) <= 0)) {
      setError('Nhập diện tích trước — mã BĐS tự sinh theo diện tích.');
      return;
    }

    const values = {
      code: isEdit
        ? form.code.trim()
        : `HL-${Math.round(Number(form.area))}-${String(nextSeq).padStart(5, '0')}`,
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
        // Sang trang sửa để thêm ảnh ngay
        router.push(`/bds/${created.id}/sua`);
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

  if (role && role !== 'admin' && role !== 'owner') {
    return (
      <div className="form-notice">
        Chỉ tài khoản admin mới được thêm/sửa bảng hàng. Liên hệ quản trị viên nếu cần quyền.
      </div>
    );
  }

  return (
    <form className="property-form" onSubmit={handleSubmit}>
      {/* Vị trí */}
      <section>
        <h2 className="section-title">Vị trí trên bản đồ *</h2>
        <p className="form-hint">
          Bấm vào bản đồ để đặt ghim, kéo ghim để tinh chỉnh — hoặc dán tọa độ/link từ Google Maps.
          {form.lat != null && ` Đã chấm: ${form.lat.toFixed(5)}, ${form.lng.toFixed(5)}`}
        </p>

        <div className="gmaps-row">
          <input
            value={gmapsInput}
            onChange={(e) => setGmapsInput(e.target.value)}
            placeholder="Dán tọa độ Google Maps: 21.00812, 105.52643 (hoặc link đầy đủ)"
          />
          <button type="button" className="btn-secondary btn-gmaps" onClick={applyGmaps}>
            Định vị
          </button>
          <button
            type="button"
            className="btn-secondary btn-gmaps"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? 'Đang lấy…' : '📍 Vị trí của tôi'}
          </button>
        </div>
        {gmapsError && <div className="gmaps-error">{gmapsError}</div>}
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
            Mã BĐS (tự sinh)
            <input value={autoCode} disabled title="Mã tự tạo theo diện tích + số thứ tự" />
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

      {/* Ảnh: chỉ sau khi BĐS đã tồn tại */}
      {isEdit ? (
        <ImageManager propertyId={property.id} />
      ) : (
        <p className="form-hint">💡 Lưu BĐS xong sẽ chuyển sang bước thêm ảnh.</p>
      )}

      {error && <div className="login-error">{error}</div>}

      <div className="form-actions">
        {isEdit && (
          <button
            type="button"
            className="btn-danger"
            disabled={saving}
            onClick={async () => {
              const check = window.prompt(
                `Xóa vĩnh viễn "${property.code}" cùng toàn bộ ảnh?\nGõ chính xác mã BĐS để xác nhận:`
              );
              if (check !== property.code) {
                if (check !== null) window.alert('Mã không khớp — đã hủy xóa.');
                return;
              }
              setSaving(true);
              try {
                await deleteProperty(property.id);
                router.push('/');
                router.refresh();
              } catch (err) {
                setError(err.message);
                setSaving(false);
              }
            }}
          >
            Xóa BĐS
          </button>
        )}
        <span className="form-actions-spacer" />
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
