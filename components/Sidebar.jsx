'use client';

import SearchBox from './SearchBox';
import FilterPanel from './FilterPanel';

export default function Sidebar({ filters, onFiltersChange, totalCount, filteredCount, open }) {
  return (
    <aside className={`sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-search">
        <SearchBox
          value={filters.search}
          onChange={(search) => onFiltersChange({ ...filters, search })}
        />
      </div>

      <div className="sidebar-body">
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
