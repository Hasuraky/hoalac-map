'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchProperty } from '@/lib/properties';
import { formatPrice, STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import ShareButton from '@/components/ShareButton';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(undefined); // undefined = đang tải
  const [role, setRole] = useState('guest');

  useEffect(() => {
    if (!id) return;
    fetchProperty(id)
      .then(({ data, role }) => {
        setProperty(data);
        setRole(role ?? 'guest');
      })
      .catch(() => setProperty(null));
  }, [id]);

  if (property === undefined) return <div className="detail-page">Đang tải…</div>;
  if (property === null) {
    return (
      <div className="detail-page">
        <Link href="/" className="back">← Về bản đồ</Link>
        <p>Không tìm thấy bất động sản này.</p>
      </div>
    );
  }

  const color = STATUS_COLORS[property.status] ?? '#8b877c';
  const unitPrice =
    property.price && property.area ? (property.price / 1e6 / property.area).toFixed(1) : null;

  const fields = [
    ['Mã BĐS', property.code],
    ['Loại hình', property.type],
    ['Trạng thái', STATUS_LABELS[property.status] ?? property.status],
    ['Mặt tiền', property.frontage ? `${property.frontage} m` : null],
    ['Đường trước nhà', property.road_width ? `${property.road_width} m` : null],
    ['Hướng', property.direction],
    ['Pháp lý', property.legal],
    ['Địa chỉ', property.address],
  ];

  return (
    <div className="detail-shell">
      {/* Thanh điều hướng */}
      <header className="detail-nav">
        <Link href="/" className="back">← Quay lại bản đồ</Link>
        <span className="sep">|</span>
        <span className="code">{property.code}</span>
        <a
          className="btn-edit btn-directions"
          href={`https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`}
          target="_blank"
          rel="noreferrer"
        >
          🧭 Chỉ đường
        </a>
        <ShareButton title={`${property.code} — ${property.title}`} />
        {(role === 'admin' || role === 'owner') && (
          <Link href={`/bds/${property.id}/sua`} className="btn-edit">✎ Sửa</Link>
        )}
      </header>

      <main className="detail-page">
        <div className="detail-card">
          {/* Hero */}
          <div className="detail-hero">
            {property.thumbnail ? (
              <img src={property.thumbnail} alt={property.title} />
            ) : (
              <div className="detail-hero-fallback">{property.type ?? 'BĐS'}</div>
            )}
            <span
              className="detail-status"
              style={{ color, borderColor: color, background: `${color}22` }}
            >
              {STATUS_LABELS[property.status] ?? property.status}
            </span>
            <div className="detail-hero-title">
              <p>{property.code}</p>
              <h1>{property.title}</h1>
            </div>
          </div>

          <div className="detail-content">
            {role === 'guest' && (
              <div className="guest-banner">
                🔒 Bạn đang xem với tư cách khách.{' '}
                <a href="/login">Đăng nhập</a> để xem giá và thông tin đầy đủ.
              </div>
            )}

            {/* 3 thẻ chỉ số */}
            <div className="metric-grid">
              <div className="metric primary">
                <p className="metric-label">Giá bán</p>
                <p className="metric-value">
                  {property.price === undefined ? '🔒' : formatPrice(property.price)}
                </p>
              </div>
              <div className="metric">
                <p className="metric-label">Diện tích</p>
                <p className="metric-value">{property.area ?? '—'}</p>
                <p className="metric-unit">m²</p>
              </div>
              <div className="metric">
                <p className="metric-label">Đơn giá</p>
                <p className="metric-value">{unitPrice ?? '—'}</p>
                <p className="metric-unit">triệu/m²</p>
              </div>
            </div>

            {/* Mô tả */}
            {property.description && (
              <section>
                <h2 className="section-title">Mô tả</h2>
                <p className="description">{property.description}</p>
              </section>
            )}

            {/* Bảng thông tin */}
            <section>
              <h2 className="section-title">Thông tin chi tiết</h2>
              <div className="detail-grid">
                {fields
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div className="cell" key={label}>
                      <div className="label">{label}</div>
                      <div className="value">{value}</div>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
