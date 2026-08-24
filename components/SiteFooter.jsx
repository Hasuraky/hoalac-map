// Chân trang dùng chung cho các trang Next (giống footer trang chủ).
export default function SiteFooter() {
  return (
    <footer className="sfooter">
      <img className="sfooter-watermark" src="/footer-logo.svg" alt="" aria-hidden="true" />
      <div className="sfooter-inner">
        <div className="sfooter-top">
          <div className="sfooter-brand">
            <p className="sfooter-wordmark">
              <img src="/logo-dev.svg" alt="Hướng về Hoà Lạc" />
              <span>Hướng về Hoà Lạc</span>
              <span className="dot">.</span>
            </p>
            <a className="sfooter-email" href="mailto:huongdm00@huongdm.com">
              huongdm00@huongdm.com ↗
            </a>
          </div>
        </div>

        <div className="sfooter-grid">
          <div>
            <p>Khám phá</p>
            <a href="/#properties">Dự án đang bán</a>
            <a href="/#developments">Sản phẩm riêng</a>
            <a href="/#media">Truyền thông</a>
            <a href="/#about">Về tôi</a>
          </div>
          <div>
            <p>Trang phụ</p>
            <a href="/ban-do">Bản đồ bảng hàng</a>
            <a href="/bang-hang">Danh sách bảng hàng</a>
            <a href="/cho-thue">Cho thuê</a>
            <a href="/blog">Blog</a>
          </div>
          <div>
            <p>Liên hệ</p>
            <a href="tel:0326022221">0326 022 221</a>
            <a href="https://zalo.me/0326022221" target="_blank" rel="noopener">Zalo</a>
            <a href="https://maps.app.goo.gl/qidEJpG7fq4jcevq9" target="_blank" rel="noopener">
              140 Đ. Thôn 2, Hòa Lạc, Hà Nội
            </a>
          </div>
          <div>
            <p>Kết nối</p>
            <a href="https://www.facebook.com/profile.php?id=61593126200993" target="_blank" rel="noopener">
              Facebook
            </a>
            <a href="https://www.tiktok.com/@huongvehoalac" target="_blank" rel="noopener">
              TikTok
            </a>
            <a href="https://www.youtube.com/@huongvehoalac" target="_blank" rel="noopener">
              YouTube
            </a>
          </div>
        </div>

        <div className="sfooter-bottom">
          <span>
            © 2026 Đỗ Mạnh Hướng ·{' '}
            <a href="https://huongdm.com" target="_blank" rel="noopener">
              huongdm.com
            </a>
          </span>
          <span>Hòa Lạc · Việt Nam</span>
        </div>
      </div>
    </footer>
  );
}
