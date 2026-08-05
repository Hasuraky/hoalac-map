/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Không để cảnh báo lint chặn deploy (kiểm tra chất lượng làm riêng khi cần)
  eslint: { ignoreDuringBuilds: true },
  // Trang chính "/" phục vụ landing page tĩnh (public/landing.html).
  // Bản đồ chuyển sang /ban-do.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/landing.html' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
