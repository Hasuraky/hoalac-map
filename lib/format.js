// Định dạng giá VND: 3200000000 -> "3,2 tỷ", 850000000 -> "850 triệu"
export function formatPrice(price) {
  if (price == null) return 'Thỏa thuận';
  if (price >= 1e9) {
    const ty = price / 1e9;
    return `${ty.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  }
  if (price >= 1e6) {
    return `${Math.round(price / 1e6).toLocaleString('vi-VN')} triệu`;
  }
  return price.toLocaleString('vi-VN') + ' đ';
}

export const STATUS_LABELS = {
  available: 'Còn hàng',
  deposited: 'Đã cọc',
  sold: 'Đã bán',
  inactive: 'Ngừng bán',
};

// Hài hòa với theme Warm Stone / Deep Moss Green
export const STATUS_COLORS = {
  available: '#2f7d46', // xanh rêu — còn hàng
  deposited: '#c9862b', // vàng đất — đã cọc
  sold: '#b3402f',      // đỏ gạch — đã bán
  inactive: '#8b877c',  // xám đá ấm — ngừng bán
};
