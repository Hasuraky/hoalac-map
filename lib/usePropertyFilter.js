'use client';

import { useMemo } from 'react';

// Khoảng lọc mặc định
export const PRICE_RANGE = [0, 20]; // tỷ VND
export const AREA_RANGE = [0, 500]; // m²

export const DEFAULT_FILTERS = {
  search: '',
  statuses: [],
  priceRange: PRICE_RANGE,
  areaRange: AREA_RANGE,
};

// Lọc danh sách BĐS theo: từ khóa (mã/tên/địa chỉ), trạng thái, giá, diện tích
export function usePropertyFilter(properties, filters) {
  return useMemo(() => {
    return properties.filter((p) => {
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const hit =
          (p.code ?? '').toLowerCase().includes(q) ||
          (p.title ?? '').toLowerCase().includes(q) ||
          (p.address ?? '').toLowerCase().includes(q);
        if (!hit) return false;
      }

      if (filters.statuses.length > 0 && !filters.statuses.includes(p.status)) {
        return false;
      }

      const priceTy = (p.price ?? 0) / 1e9;
      if (priceTy < filters.priceRange[0] || priceTy > filters.priceRange[1]) {
        return false;
      }

      const area = p.area ?? 0;
      if (area < filters.areaRange[0] || area > filters.areaRange[1]) {
        return false;
      }

      return true;
    });
  }, [properties, filters]);
}
