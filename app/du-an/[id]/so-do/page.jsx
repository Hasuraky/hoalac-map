'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchRole } from '@/lib/properties';
import { fetchProjects } from '@/lib/projects';

const OverlayEditor = dynamic(() => import('@/components/admin/OverlayEditor'), {
  ssr: false,
  loading: () => <div className="detail-page">Đang tải trình chỉnh…</div>,
});

export default function OverlayEditorPage() {
  const { id } = useParams();
  const [project, setProject] = useState(undefined);
  const [role, setRole] = useState(null);

  useEffect(() => {
    fetchRole().then(setRole);
    fetchProjects().then((list) => setProject(list.find((p) => p.id === id) ?? null));
  }, [id]);

  if (project === undefined || role === null) return <div className="detail-page">Đang tải…</div>;
  if (role !== 'admin' && role !== 'owner') {
    return (
      <div className="detail-page">
        <Link href="/quan-tri" className="back">← Khu nội bộ</Link>
        <p className="form-notice">Chỉ admin/owner được chỉnh sơ đồ dự án.</p>
      </div>
    );
  }
  if (!project) {
    return (
      <div className="detail-page">
        <Link href="/quan-tri" className="back">← Khu nội bộ</Link>
        <p>Không tìm thấy dự án.</p>
      </div>
    );
  }

  return (
    <div className="detail-shell">
      <header className="detail-nav">
        <Link href="/quan-tri" className="back">← Khu nội bộ</Link>
        <span className="sep">|</span>
        <span className="code">Sơ đồ: {project.name}</span>
      </header>
      <OverlayEditor project={project} />
    </div>
  );
}
