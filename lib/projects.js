import { supabase } from './supabase';

// Đọc danh sách dự án (công khai — dùng cho form + bộ lọc)
export async function fetchProjects() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('name', { ascending: true });
  if (error) return [];
  return data ?? [];
}

// Chỉ dự án nổi bật (cho thanh bộ lọc)
export async function fetchFeaturedProjects() {
  const all = await fetchProjects();
  return all.filter((p) => p.is_featured);
}
