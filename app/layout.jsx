import './globals.css';

export const metadata = {
  title: 'Bản đồ BĐS Hòa Lạc',
  description: 'Hệ thống quản lý bất động sản Hòa Lạc trên bản đồ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
