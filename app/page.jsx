'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import UserMenu from '@/components/UserMenu';
import Sidebar from '@/components/Sidebar';
import LeadForm from '@/components/LeadForm';
import { fetchProperties } from '@/lib/properties';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import { usePropertyFilter, DEFAULT_FILTERS } from '@/lib/usePropertyFilter';
import { fetchFeaturedProjects } from '@/lib/projects';

// Leaflet chỉ chạy phía trình duyệt -> tắt SSR cho bản đồ
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="map-loading">Đang tải bản đồ…</div>,
});

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [isMock, setIsMock] = useState(false);
  const [role, setRole] = useState('guest');
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [featured, setFeatured] = useState([]);
  const [flyTarget, setFlyTarget] = useState(null); // { lng, lat, zoom, key }

  useEffect(() => {
    fetchProperties()
      .then(({ data, isMock, role }) => {
        setProperties(data);
        setIsMock(isMock);
        setRole(role ?? 'guest');
      })
      .catch((e) => setError(e.message));
    fetchFeaturedProjects().then(setFeatured);
  }, []);

  function flyToProject(p) {
    // Có sơ đồ -> canh khít khung ảnh (luôn thấy trọn hình)
    if (p.overlay_coords && p.overlay_coords.length === 4) {
      setFlyTarget({ bounds: p.overlay_coords, key: Date.now() });
      setSidebarOpen(false);
      return;
    }
    if (p.center_lat == null || p.center_lng == null) return;
    setFlyTarget({ lng: p.center_lng, lat: p.center_lat, zoom: p.zoom ?? 16, key: Date.now() });
    setSidebarOpen(false);
  }

  const filtered = usePropertyFilter(properties, filters);

  return (
    <div className="map-page">
      <header className="topbar">
        <div className="topbar-brand">
          <img className="brand-logo" src="/logo.svg" alt="" />
          <h1>Bản đồ BĐS Hòa Lạc</h1>
        </div>

        <div className="topbar-right">
          <div className="topbar-legend">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <span className="legend-item" key={key}>
                <span className="legend-dot" style={{ background: STATUS_COLORS[key] }} />
                {label}
              </span>
            ))}
          </div>
          {isMock && <span className="badge">dữ liệu mẫu</span>}
          {(role === 'admin' || role === 'owner') && (
            <a href="/bds/moi" className="btn-add">+ Thêm BĐS</a>
          )}
          {(role === 'sale' || role === 'admin' || role === 'owner') && (
            <a href="/quan-tri" className="btn-add">Nội bộ</a>
          )}
          <UserMenu />
        </div>
      </header>

      <div className="map-body">
        <Sidebar
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={properties.length}
          filteredCount={filtered.length}
          open={sidebarOpen}
          featured={featured}
          onFlyProject={flyToProject}
        />

        <div className="map-wrap">
          {error ? (
            <div className="map-loading">Lỗi tải dữ liệu: {error}</div>
          ) : (
            <MapView properties={filtered} flyTarget={flyTarget} />
          )}

          {/* Nút bộ lọc trên mobile */}
          <button className="btn-filter-toggle" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? 'Đóng bộ lọc' : `Bộ lọc (${filtered.length})`}
          </button>

          {/* Nút yêu cầu tư vấn — chỉ hiện với khách chưa đăng nhập */}
          {role === 'guest' && <LeadForm />}
        </div>
      </div>
    </div>
  );
}
