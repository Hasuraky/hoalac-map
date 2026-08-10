/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Không để cảnh báo lint chặn deploy (kiểm tra chất lượng làm riêng khi cần)
  eslint: { ignoreDuringBuilds: true },
  // Trang chính "/" phục vụ landing page tĩnh (public/landing.html).
  // Bản đồ chuyển sang /ban-do.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/landing.html' },
        { source: '/xanh-villas', destination: '/xanh-villas.html' },
        { source: '/metro-city', destination: '/metro-city.html' },
        { source: '/wealth-kansen-valley', destination: '/wealth-kansen-valley.html' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
