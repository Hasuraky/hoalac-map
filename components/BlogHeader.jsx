// Header dùng chung cho các trang blog (server component, không dùng hook).
export default function BlogHeader({ active }) {
  return (
    <header className="rent-header">
      <div className="rh-left">
        <a className="rent-brand" href="/" title="Trang chủ">
          <img src="/logo-dev.svg" alt="" />
          <h1>Hướng về Hoà Lạc</h1>
        </a>
        <nav className="rent-nav">
          <a href="/ban-do">Bản đồ bảng hàng</a>
          <a href="/bang-hang">Danh sách bảng hàng</a>
          <a href="/cho-thue">Cho thuê</a>
          <a href="/blog" className={active === 'blog' ? 'active' : undefined}>
            Blog
          </a>
        </nav>
      </div>
      <div className="rh-right">
        <a className="btn-add" href="/login">
          Đăng nhập
        </a>
      </div>
    </header>
  );
}
