'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import UserMenu from '@/components/UserMenu';
import SiteFooter from '@/components/SiteFooter';
import FloatingAd from '@/components/FloatingAd';
import { fetchProperties } from '@/lib/properties';
import { fetchProjects } from '@/lib/projects';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/format';

function formatPrice(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + ' triệu';
  return n.toLocaleString('vi-VN');
}

const NONE = '__none__';

export default function BangHangPage() {
  const [properties, setProperties] = useState([]);
  const [projects, setProjects] = useState([]);
  const [role, setRole] = useState('guest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('all');
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    Promise.all([fetchProperties(), fetchProjects()])
      .then(([props, projs]) => {
        setProperties(props.data ?? []);
        setRole(props.role ?? 'guest');
        setProjects(projs ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isStaff = ['sale', 'admin', 'owner'].includes(role);

  const groups = useMemo(() => {
    const filtered = status === 'all' ? properties : properties.filter((p) => p.status === status);
    const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
    const map = {};
    for (const p of filtered) {
      const key = p.project_id && byId[p.project_id] ? p.project_id : NONE;
      (map[key] ??= []).push(p);
    }
    const orderedProjects = [...projects]
      .filter((p) => map[p.id])
      .sort(
        (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) || a.name.localeCompare(b.name, 'vi')
      );
    const result = orderedProjects.map((p) => ({ key: p.id, name: p.name, featured: p.is_featured, items: map[p.id] }));
    if (map[NONE]) result.push({ key: NONE, name: 'BĐS lẻ / khác', featured: false, items: map[NONE] });
    return result;
  }, [properties, projects, status]);

  const total = groups.reduce((s, g) => s + g.items.length, 0);

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
            <a href="/bang-hang" className="active">Danh sách bảng hàng</a>
            <a href="/cho-thue">Cho thuê</a>
            <a href="/blog">Blog</a>
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
            <p className="rent-eyebrow">Danh sách bảng hàng</p>
            <h2>Sản phẩm đang bán</h2>
          </div>
          <div className="rent-filter">
            {[['all', 'Tất cả'], ...Object.entries(STATUS_LABELS).map(([k, l]) => [k, l])].map(([k, l]) => (
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
        ) : total === 0 ? (
          <p className="rent-empty">Chưa có sản phẩm nào.</p>
        ) : (
          groups.map((g) => {
            const isOpen = !collapsed[g.key];
            return (
              <section className="pl-group" key={g.key}>
                <button
                  type="button"
                  className="pl-group-head"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.key]: isOpen }))}
                >
                  <span className="pl-group-name">
                    {g.featured && <span className="pl-star">★</span>}
                    {g.name}
                    <span className="pl-count">{g.items.length}</span>
                  </span>
                  <span className={`pl-caret${isOpen ? ' open' : ''}`}>▾</span>
                </button>
                {isOpen && (
                  <div className="rent-grid">
                    {g.items.map((p) => {
                      const price = formatPrice(p.price);
                      const color = STATUS_COLORS[p.status] || '#8b877c';
                      const label = STATUS_LABELS[p.status] || p.status;
                      return (
                        <Link className="rent-card" href={`/bds/${p.id}`} key={p.id}>
                          <div className="rent-thumb">
                            {p.thumbnail ? (
                              <img src={p.thumbnail} alt={p.title} loading="lazy" />
                            ) : (
                              <div className="rent-ph">Chưa có ảnh</div>
                            )}
                            <span className="rent-badge" style={{ background: color }}>
                              {label}
                            </span>
                          </div>
                          <div className="rent-body">
                            <div className="rent-meta">{p.type || 'BĐS'}</div>
                            <h3>{p.title}</h3>
                            <div className="rent-facts">
                              {p.area != null && <span>{p.area} m²</span>}
                              {p.code && <span>{p.code}</span>}
                            </div>
                            <div className="rent-price">{price || 'Liên hệ'}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>
      <SiteFooter />
      <FloatingAd />
    </div>
  );
}
