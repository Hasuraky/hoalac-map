'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRole } from '@/lib/properties';

const ROLE_LABELS = { owner: 'Chủ sở hữu', admin: 'Admin', sale: 'Sale', user: 'Người dùng' };

export default function AdminPage() {
  const [myRole, setMyRole] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Form tạo tài khoản
  const [form, setForm] = useState({ email: '', password: '', full_name: '', phone: '', role: 'sale' });

  const isOwner = myRole === 'owner';

  async function load() {
    setError(null);
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      setUsers([]);
    } else {
      setUsers(json.users);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRole().then((r) => {
      setMyRole(r);
      if (r === 'admin' || r === 'owner') load();
      else setLoading(false);
    });
  }, []);

  async function createUser(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setForm({ email: '', password: '', full_name: '', phone: '', role: 'sale' });
    load();
  }

  async function patchUser(id, payload) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  async function deleteUser(u) {
    if (!window.confirm(`Xóa vĩnh viễn tài khoản ${u.email}?`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  if (loading) return <div className="detail-page">Đang tải…</div>;

  if (myRole !== 'admin' && myRole !== 'owner') {
    return (
      <div className="detail-page">
        <Link href="/" className="back">← Về bản đồ</Link>
        <p className="form-notice">Trang này chỉ dành cho admin và chủ sở hữu.</p>
      </div>
    );
  }

  return (
    <div className="detail-shell">
      <header className="detail-nav">
        <Link href="/" className="back">← Về bản đồ</Link>
        <span className="sep">|</span>
        <span className="code">Quản trị tài khoản</span>
      </header>

      <main className="detail-page">
        {error && <div className="login-error">{error}</div>}

        {/* Tạo tài khoản */}
        <div className="detail-card admin-card">
          <h2 className="section-title">Tạo tài khoản mới</h2>
          <form className="admin-form" onSubmit={createUser}>
            <label>
              Email / tên đăng nhập *
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ten@hoalac.local"
                required
              />
            </label>
            <label>
              Mật khẩu * (≥6 ký tự)
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <label>
              Họ tên
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </label>
            <label>
              Số điện thoại
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Cấp
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">Người dùng</option>
                <option value="sale">Sale</option>
                {isOwner && <option value="admin">Admin</option>}
              </select>
            </label>
            <button type="submit" className="btn-primary btn-inline" disabled={busy}>
              {busy ? 'Đang tạo…' : 'Tạo tài khoản'}
            </button>
          </form>
          <p className="form-hint">
            Mẹo: nhân viên nội bộ có thể dùng email quy ước như <code>ten@hoalac.local</code> (không
            cần email thật).
          </p>
        </div>

        {/* Danh sách */}
        <div className="detail-card admin-card">
          <h2 className="section-title">Tài khoản ({users.length})</h2>
          <div className="admin-table">
            {users.map((u) => (
              <div className={`admin-row${u.is_active ? '' : ' locked'}`} key={u.id}>
                <div className="admin-user">
                  <strong>{u.full_name || u.email}</strong>
                  <span className="admin-meta">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ''}
                    {!u.is_active && ' · đã khóa'}
                  </span>
                </div>

                <span className={`role-badge role-${u.role}`}>{ROLE_LABELS[u.role]}</span>

                {u.role === 'owner' ? (
                  <span className="admin-note">Không thể thao tác</span>
                ) : (
                  <div className="admin-actions">
                    {/* Đổi cấp: admin chỉ đặt sale/user; owner thêm admin */}
                    <select
                      value={u.role}
                      disabled={busy || (myRole === 'admin' && u.role === 'admin')}
                      onChange={(e) => patchUser(u.id, { role: e.target.value })}
                    >
                      <option value="user">Người dùng</option>
                      <option value="sale">Sale</option>
                      {isOwner && <option value="admin">Admin</option>}
                    </select>

                    <button
                      type="button"
                      className="btn-mini"
                      disabled={busy || (myRole === 'admin' && u.role === 'admin')}
                      onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? 'Khóa' : 'Mở khóa'}
                    </button>
                    <button
                      type="button"
                      className="btn-mini danger"
                      disabled={busy || (myRole === 'admin' && u.role === 'admin')}
                      onClick={() => deleteUser(u)}
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
