'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchProperty } from '@/lib/properties';
import PropertyForm from '@/components/PropertyForm';

export default function EditPropertyPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(undefined);

  useEffect(() => {
    if (!id) return;
    fetchProperty(id)
      .then(({ data }) => setProperty(data))
      .catch(() => setProperty(null));
  }, [id]);

  if (property === undefined) return <div className="detail-page">Đang tải…</div>;
  if (property === null) {
    return (
      <div className="detail-page">
        <Link href="/" className="back">← Về bản đồ</Link>
        <p>Không tìm thấy bất động sản này.</p>
      </div>
    );
  }

  return (
    <div className="detail-shell">
      <header className="detail-nav">
        <Link href={`/bds/${property.id}`} className="back">← Quay lại chi tiết</Link>
        <span className="sep">|</span>
        <span className="code">Sửa {property.code}</span>
      </header>
      <main className="detail-page">
        <div className="detail-card form-card">
          <PropertyForm property={property} />
        </div>
      </main>
    </div>
  );
}
