'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRole } from '@/lib/properties';
import MembersPanel from '@/components/admin/MembersPanel';
import LeadsPanel from '@/components/admin/LeadsPanel';

export default function InternalPage() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('leads');

  useEffect(() => {
    fetchRole().then((r) => {
      setRole(r);
      setTab('members'); // mặc định mở Thành viên
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="detail-page">Đang tải…</div>;

  if (!['sale', 'admin', 'owner'].includes(role)) {
    return (
      <div className="detail-page">
        <Link href="/" className="back">← Về bản đồ</Link>
        <p className="form-notice">Khu vực này dành cho nhân viên nội bộ.</p>
      </div>
    );
  }

  // Danh sách mục thanh bên (dễ mở rộng sau) — sale cũng xem được Thành viên (danh bạ)
  const menu = [
    { key: 'members', label: 'Thành viên', icon: '👥' },
    { key: 'leads', label: 'Data tư vấn', icon: '💬' },
  ];

  return (
    <div className="internal-shell">
      <aside className="internal-sidebar">
        <div className="internal-brand">
          <Link href="/" className="internal-back">← Bản đồ</Link>
          <h1>Khu nội bộ</h1>
        </div>
        <nav className="internal-nav">
          {menu.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`internal-navitem${tab === m.key ? ' active' : ''}`}
              onClick={() => setTab(m.key)}
            >
              <span className="internal-navicon">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="internal-main">
        <h2 className="internal-heading">
          {tab === 'members' ? 'Thành viên' : 'Data yêu cầu tư vấn'}
        </h2>
        {tab === 'members' && <MembersPanel myRole={role} />}
        {tab === 'leads' && <LeadsPanel myRole={role} />}
      </main>
    </div>
  );
}
