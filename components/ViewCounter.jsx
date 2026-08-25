'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Tăng lượt xem 1 lần / phiên trình duyệt cho mỗi bài.
export default function ViewCounter({ slug }) {
  useEffect(() => {
    if (!supabase || !slug) return;
    try {
      const key = 'viewed:' + slug;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // sessionStorage bị chặn -> vẫn đếm
    }
    (async () => {
      try {
        await supabase.rpc('increment_post_views', { p_slug: slug });
      } catch {
        /* bỏ qua lỗi đếm view */
      }
    })();
  }, [slug]);

  return null;
}
