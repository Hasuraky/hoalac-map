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
  onFlyProject,
}) {
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
