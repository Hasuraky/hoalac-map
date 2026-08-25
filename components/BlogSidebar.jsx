// Rail quảng cáo nội bộ 2 bên bài blog (dự án riêng + khám phá thêm).
// Server component, không dùng hook.

const PROJECTS = [
  {
    href: '/xanh-villas',
    img: '/xanh-villas/01-toan-canh-hoang-hon.jpg',
    name: 'Xanh Villas',
    tag: 'Biệt thự nghỉ dưỡng ven suối',
  },
  {
    href: '/metro-city',
    img: '/metro-city/01-phoi-canh-tong-the.jpg',
    name: 'Hòa Lạc Metro City',
    tag: 'Đô thị cao cấp trung tâm CBD',
  },
  {
    href: '/wealth-kansen-valley',
    img: '/wealth-kansen-valley/wkv-01.jpg',
    name: 'Wealth Kansen Valley',
    tag: 'Compound khép kín giữa thung lũng',
  },
];

const LINKS = [
  { href: '/ban-do', ico: '🗺️', label: 'Bản đồ bảng hàng' },
  { href: '/bang-hang', ico: '🏘️', label: 'Danh sách bảng hàng' },
  { href: '/cho-thue', ico: '🔑', label: 'Bất động sản cho thuê' },
  { href: '/blog', ico: '📰', label: 'Bài viết mới nhất' },
];

export default function BlogSidebar({ side = 'left' }) {
  if (side === 'left') {
    return (
      <aside className="blog-rail blog-rail-left" aria-label="Dự án nổi bật">
        <div className="rail-inner">
          <div className="rail-title">Dự án đang bán</div>
          {PROJECTS.map((p) => (
            <a key={p.href} className="rail-card" href={p.href}>
              <img src={p.img} alt={p.name} loading="lazy" />
              <div className="rc-body">
                <div className="rc-name">{p.name}</div>
                <div className="rc-tag">{p.tag}</div>
              </div>
            </a>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="blog-rail blog-rail-right" aria-label="Khám phá thêm">
      <div className="rail-inner">
        <div className="rail-title">Khám phá thêm</div>
        {LINKS.map((l) => (
          <a key={l.href} className="rail-link" href={l.href}>
            <span className="ri-ico">{l.ico}</span>
            <span>{l.label}</span>
          </a>
        ))}
        <div className="rail-contact">
          <div className="rc2-name">Đỗ Mạnh Hướng</div>
          <div className="rc2-role">Môi giới BĐS khu vực Hòa Lạc</div>
          <a className="rc2-btn" href="https://zalo.me/0326022221" target="_blank" rel="noopener">
            Liên hệ Zalo · 0326 022 221
          </a>
        </div>
      </div>
    </aside>
  );
}
