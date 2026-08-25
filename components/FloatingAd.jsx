'use client';

import { useEffect, useState } from 'react';

// Góc quảng cáo nhỏ nổi ở góc phải dưới màn hình. Đóng được (nhớ trong phiên).
export default function FloatingAd() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('floatad:closed')) return;
    } catch {
      /* bỏ qua */
    }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem('floatad:closed', '1');
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <div className="floatad" role="complementary" aria-label="Quảng cáo">
      <button className="floatad-x" onClick={close} aria-label="Đóng">
        ×
      </button>
      <a className="floatad-link" href="/xanh-villas">
        <img src="/xanh-villas/01-toan-canh-hoang-hon.jpg" alt="Xanh Villas" loading="lazy" />
        <div className="floatad-body">
          <div className="floatad-tag">Dự án nổi bật</div>
          <div className="floatad-name">Xanh Villas Hòa Lạc</div>
          <div className="floatad-sub">Biệt thự nghỉ dưỡng ven suối →</div>
        </div>
      </a>
      <a className="floatad-zalo" href="https://zalo.me/0326022221" target="_blank" rel="noopener">
        Liên hệ Zalo · 0326 022 221
      </a>
    </div>
  );
}
