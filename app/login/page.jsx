'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Chế độ demo (chưa cấu hình Supabase) — không cần đăng nhập
  if (!supabase) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Bản đồ BĐS Hòa Lạc</h1>
          <p className="login-note">
            Đang chạy chế độ demo với dữ liệu mẫu — chưa cần đăng nhập.
            Cấu hình Supabase trong <code>.env.local</code> để bật đăng nhập.
          </p>
          <button className="btn-primary" onClick={() => router.push('/')}>
            Vào bản đồ
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Email hoặc mật khẩu không đúng.'
          : signInError.message
      );
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Bản đồ BĐS Hòa Lạc</h1>
        <p className="login-note">Đăng nhập bằng tài khoản do quản trị viên cấp.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="ten@congty.vn"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <a
          className="login-contact"
          href="https://huongdm.com"
          target="_blank"
          rel="noreferrer"
        >
          Chưa có tài khoản? Liên hệ đơn vị phát triển
        </a>

        <a href="/" className="login-back">← Về trang bản đồ</a>
      </div>
    </div>
  );
}
