'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
import { fetchRentals, RENTAL_STATUS, formatRent } from '@/lib/rentals';

export default function ChoThuePage() {
  const [rentals, setRentals] = useState([]);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetchRentals()
      .then(({ data, role }) => {
        setRentals(data);
        setRole(role ?? 'guest');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isStaff = ['sale', 'admin', 'owner'].includes(role);
  const filtered = status === 'all' ? rentals : rentals.filter((r) => r.status === status);

  return (
    <div className="rent-page">
      <header className="rent-header">
        <div className="rh-left">
          <a className="rent-brand" href="/" title="Trang chủ">
            <img src="/logo-dev.svg" alt="" />
            <h1>Hướng về Hoà Lạc</h1>
          </a>
          <nav className="rent-nav">
            <a href="/ban-do">Bản đồ bảng hàng</a>
            <a href="/bang-hang">Danh sách bảng hàng</a>
            <a href="/cho-thue" className="active">Cho thuê</a>
          </nav>
        </div>
        <div className="rh-right">
          {isStaff && (
            <Link href="/quan-tri" className="btn-add">
              Nội bộ
            </Link>
          )}
          <UserMenu />
        </div>
      </header>

      <main className="rent-main">
        <div className="rent-head">
          <div>
            <p className="rent-eyebrow">Bảng hàng cho thuê</p>
            <h2>Cho thuê tại Hòa Lạc</h2>
          </div>
          <div className="rent-filter">
            {[
              ['all', 'Tất cả'],
              ['available', 'Còn trống'],
              ['rented', 'Đã thuê'],
            ].map(([k, l]) => (
              <button
                key={k}
                type="button"
                className={`rent-chip${status === k ? ' active' : ''}`}
                onClick={() => setStatus(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="rent-empty">Đang tải…</p>
        ) : error ? (
          <p className="rent-empty">Lỗi tải dữ liệu: {error}</p>
        ) : filtered.length === 0 ? (
          <p className="rent-empty">Chưa có tin cho thuê. Vui lòng quay lại sau.</p>
        ) : (
          <div className="rent-grid">
            {filtered.map((r) => {
              const st = RENTAL_STATUS[r.status] || { label: r.status, color: '#8b877c' };
              return (
                <article className="rent-card" key={r.id}>
                  <div className="rent-thumb">
                    {r.images && r.images[0] ? (
                      <img src={r.images[0]} alt={r.title} loading="lazy" />
                    ) : (
                      <div className="rent-ph">Chưa có ảnh</div>
                    )}
                    <span className="rent-badge" style={{ background: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="rent-body">
                    <div className="rent-meta">
                      {r.district || 'Hòa Lạc'}
                      {r.type ? ` · ${r.type}` : ''}
                    </div>
                    <h3>{r.title}</h3>
                    <div className="rent-facts">
                      {r.area != null && <span>{r.area} m²</span>}
                      {r.bedrooms != null && <span>{r.bedrooms} PN</span>}
                      {r.furniture && <span>{r.furniture}</span>}
                    </div>
                    <div className="rent-price">
                      {formatRent(r.rent_price)}
                      <small>/tháng</small>
                    </div>
                    {isStaff && (r.owner_phone || r.base_price != null || r.internal_note || r.owner_name) && (
                      <div className="rent-internal">
                        <span className="rent-internal-tag">Nội bộ</span>
                        {r.owner_name && (
                          <div>
                            Chủ nhà: {r.owner_name}
                            {r.owner_phone ? ` · ${r.owner_phone}` : ''}
                          </div>
                        )}
                        {r.base_price != null && <div>Giá gốc: {formatRent(r.base_price)}/tháng</div>}
                        {r.commission && <div>Hoa hồng: {r.commission}</div>}
                        {r.internal_note && <div>Ghi chú: {r.internal_note}</div>}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
