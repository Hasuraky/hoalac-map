import './globals.css';
import Script from 'next/script';

const GTAG_ID = 'AW-18381693741';

export const metadata = {
  metadataBase: new URL('https://www.huongvehoalac.com'),
  title: 'Bản đồ BĐS Hòa Lạc — Hướng về Hoà Lạc',
  description:
    'Hệ thống bản đồ quản lý & tra cứu bất động sản khu vực Hòa Lạc — xem vị trí, trạng thái và thông tin dự án trực quan trên bản đồ.',
  icons: {
    icon: '/favicon.svg',
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'Hướng về Hoà Lạc',
    locale: 'vi_VN',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        {children}
        {/* Google tag (gtag.js) */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GTAG_ID}');`}
        </Script>
      </body>
    </html>
  );
}
