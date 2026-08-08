import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Bản đồ BĐS Hòa Lạc',
  description: 'Hệ thống quản lý bất động sản Hòa Lạc trên bản đồ',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
