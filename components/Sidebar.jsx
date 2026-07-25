'use client';

import SearchBox from './SearchBox';
import FilterPanel from './FilterPanel';

export default function Sidebar({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
  open,
  featured = [],
  allProjects = [],
  onFlyProject,
}) {
  const featuredIds = new Set(featured.map((p) => p.id));
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-search">
        <SearchBox
          value={filters.search}
          onChange={(search) => onFiltersChange({ ...filters, search })}
        />
      </div>

      <div className="sidebar-body">
        {featured.length > 0 && (
          <div className="featured-projects">
            <p className="filter-label">Dự án nổi bật</p>
            <div className="featured-chips">
              {featured.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="featured-chip"
                  onClick={() => onFlyProject?.(p)}
                  disabled={p.center_lat == null}
                  title={p.center_lat == null ? 'Dự án chưa có tọa độ' : `Bay tới ${p.name}`}
                >
                  🏗️ {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {allProjects.length > 0 && (
          <div className="project-picker">
            <p className="filter-label">Tất cả dự án</p>
            <select
              className="project-select"
              value=""
              onChange={(e) => {
                const p = allProjects.find((x) => x.id === e.target.value);
                if (p) onFlyProject?.(p);
              }}
            >
              <option value="" disabled>
                Chọn dự án để bay tới…
              </option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id} disabled={p.center_lat == null && !(p.overlay_coords && p.overlay_coords.length === 4)}>
                  {featuredIds.has(p.id) ? '⭐ ' : ''}{p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <FilterPanel filters={filters} onChange={onFiltersChange} />

        {/* Đơn vị phát triển — neo cuối khoảng trống */}
        <a
          className="dev-credit"
          href="https://huongdm.com"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/logo-dev.svg" alt="huongdm" />
          <span>
            <small>Phát triển bởi</small>
            huongdm.com
          </span>
        </a>
      </div>

      <div className="sidebar-footer">
        Hiển thị <strong>{filteredCount}</strong> / {totalCount} BĐS
      </div>
    </aside>
  );
}
