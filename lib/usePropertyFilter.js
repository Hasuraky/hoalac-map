'use client';

import { useMemo } from 'react';

// Khoảng lọc mặc định
export const PRICE_RANGE = [0, 20]; // tỷ VND
export const AREA_RANGE = [0, 500]; // m²

export const DEFAULT_FILTERS = {
  search: '',
  statuses: [],
  types: [],
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

      if (filters.types?.length > 0) {
        const t = p.type ?? 'Khác';
        // "Khác" gom cả các loại không nằm trong danh sách chuẩn
        const matched = filters.types.includes(t) ||
          (filters.types.includes('Khác') && !['Đất nền', 'Nhà ở', 'Shophouse', 'Biệt thự'].includes(t));
        if (!matched) return false;
      }

      // Kéo hết cỡ về bên phải = không giới hạn trên (vô cùng)
      const priceTy = (p.price ?? 0) / 1e9;
      const priceMaxOpen = filters.priceRange[1] >= PRICE_RANGE[1];
      if (priceTy < filters.priceRange[0] || (!priceMaxOpen && priceTy > filters.priceRange[1])) {
        return false;
      }

      const area = p.area ?? 0;
      const areaMaxOpen = filters.areaRange[1] >= AREA_RANGE[1];
      if (area < filters.areaRange[0] || (!areaMaxOpen && area > filters.areaRange[1])) {
        return false;
      }

      return true;
    });
  }, [properties, filters]);
}
