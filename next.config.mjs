/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Không để cảnh báo lint chặn deploy (kiểm tra chất lượng làm riêng khi cần)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
