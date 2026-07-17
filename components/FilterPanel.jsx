'use client';

import { STATUS_LABELS, STATUS_COLORS } from '@/lib/format';
import { PRICE_RANGE, AREA_RANGE } from '@/lib/usePropertyFilter';

const ALL_STATUSES = Object.keys(STATUS_LABELS);

export default function FilterPanel({ filters, onChange }) {
  const toggleStatus = (status) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: next });
  };

  const resetAll = () =>
    onChange({
      search: filters.search,
      statuses: [],
      priceRange: PRICE_RANGE,
      areaRange: AREA_RANGE,
    });

  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.priceRange[0] !== PRICE_RANGE[0] ||
    filters.priceRange[1] !== PRICE_RANGE[1] ||
    filters.areaRange[0] !== AREA_RANGE[0] ||
    filters.areaRange[1] !== AREA_RANGE[1];

  return (
    <div className="filter-panel">
      <div className="filter-head">
        <h3>Bộ lọc</h3>
        {hasActiveFilters && (
          <button className="filter-reset" onClick={resetAll}>
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Trạng thái */}
      <div className="filter-group">
        <p className="filter-label">Trạng thái</p>
        {ALL_STATUSES.map((status) => {
          const checked = filters.statuses.includes(status);
          const color = STATUS_COLORS[status];
          return (
            <label className="filter-check" key={status} onClick={() => toggleStatus(status)}>
              <span
                className={`checkbox${checked ? ' checked' : ''}`}
                style={checked ? { background: color, borderColor: color } : {}}
              >
                {checked && (
                  <svg viewBox="0 0 12 12">
                    <path
                      d="M10 3L5 8.5 2 5.5"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span style={{ color: checked ? color : undefined }}>{STATUS_LABELS[status]}</span>
              <span className="dot" style={{ background: color }} />
            </label>
          );
        })}
      </div>

      {/* Giá */}
      <div className="filter-group">
        <div className="filter-row">
          <p className="filter-label">Giá (tỷ VND)</p>
          <p className="filter-value">
            {filters.priceRange[0]} – {filters.priceRange[1]} tỷ
          </p>
        </div>
        <input
          type="range"
          min={PRICE_RANGE[0]}
          max={filters.priceRange[1]}
          step={0.5}
          value={filters.priceRange[0]}
          onChange={(e) =>
            onChange({ ...filters, priceRange: [Number(e.target.value), filters.priceRange[1]] })
          }
        />
        <input
          type="range"
          min={filters.priceRange[0]}
          max={PRICE_RANGE[1]}
          step={0.5}
          value={filters.priceRange[1]}
          onChange={(e) =>
            onChange({ ...filters, priceRange: [filters.priceRange[0], Number(e.target.value)] })
          }
        />
      </div>

      {/* Diện tích */}
      <div className="filter-group">
        <div className="filter-row">
          <p className="filter-label">Diện tích (m²)</p>
          <p className="filter-value">
            {filters.areaRange[0]} – {filters.areaRange[1]} m²
          </p>
        </div>
        <input
          type="range"
          min={AREA_RANGE[0]}
          max={filters.areaRange[1]}
          step={5}
          value={filters.areaRange[0]}
          onChange={(e) =>
            onChange({ ...filters, areaRange: [Number(e.target.value), filters.areaRange[1]] })
          }
        />
        <input
          type="range"
          min={filters.areaRange[0]}
          max={AREA_RANGE[1]}
          step={5}
          value={filters.areaRange[1]}
          onChange={(e) =>
            onChange({ ...filters, areaRange: [filters.areaRange[0], Number(e.target.value)] })
          }
        />
      </div>
    </div>
  );
}
