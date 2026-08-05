'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import PropertyForm from '@/components/PropertyForm';

export default function NewPropertyPage() {
  return (
    <div className="detail-shell">
      <header className="detail-nav">
        <Link href="/ban-do" className="back">← Quay lại bản đồ</Link>
        <span className="sep">|</span>
        <span className="code">Thêm BĐS mới</span>
      </header>
      <main className="detail-page">
        <div className="detail-card form-card">
          <Suspense fallback={<div className="form-hint">Đang tải…</div>}>
            <PropertyForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
