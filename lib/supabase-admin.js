import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client toàn quyền (chỉ dùng phía server — KHÔNG bao giờ để lộ service key ra trình duyệt)
export function adminClient() {
  return createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Xác định người đang gọi API (từ cookie phiên đăng nhập)
export async function getCaller() {
  const cookieStore = cookies();
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, role: 'guest' };

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { user, role: data?.role ?? 'user' };
}

// Bậc quyền: số càng lớn càng cao
export const RANK = { user: 1, sale: 2, admin: 3, owner: 4 };
