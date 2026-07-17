'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (!supabase || !email) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="user-menu">
      <span className="user-email">{email}</span>
      <button className="btn-logout" onClick={handleLogout}>
        Đăng xuất
      </button>
    </div>
  );
}
