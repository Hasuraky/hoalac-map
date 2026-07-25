import { supabase } from './supabase';

// Đọc toàn bộ liên kết vùng (công khai — dùng cho bản đồ)
export async function fetchRegionLinks() {
  if (!supabase) return [];
  const { data } = await supabase.from('region_links').select('*');
  return data ?? [];
}
