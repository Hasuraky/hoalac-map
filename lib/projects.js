import { supabase } from './supabase';

const BUCKET = 'property-images';

// URL công khai của ảnh sơ đồ
export function overlayUrl(path) {
  if (!supabase || !path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Upload ảnh sơ đồ dự án (admin/owner — RLS storage đã chặn cấp thấp)
export async function uploadOverlay(projectId, file) {
  if (!supabase) throw new Error('Chưa kết nối Supabase.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `overlays/${projectId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (error) throw error;
  return path;
}

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
