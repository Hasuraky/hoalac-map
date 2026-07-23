'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Trang cũ -> chuyển vào khu nội bộ
export default function TuVanRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/quan-tri');
  }, [router]);
  return <div className="detail-page">Đang chuyển…</div>;
}
