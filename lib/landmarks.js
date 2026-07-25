import { supabase } from './supabase';

const BUCKET = 'property-images';

export function landmarkUrl(path) {
  if (!supabase || !path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadLandmark(file) {
  if (!supabase) throw new Error('Chưa kết nối Supabase.');
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `landmarks/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
  if (error) throw error;
  return path;
}

// Công khai — dùng cho bản đồ
export async function fetchLandmarks() {
  if (!supabase) return [];
  const { data } = await supabase.from('landmarks').select('*').order('created_at');
  return data ?? [];
}
