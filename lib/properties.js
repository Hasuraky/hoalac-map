import { supabase } from './supabase';
import { MOCK_PROPERTIES } from './mock-data';

// Lấy toàn bộ BĐS. Chưa cấu hình Supabase -> trả dữ liệu mẫu.
export async function fetchProperties() {
  if (!supabase) return { data: MOCK_PROPERTIES, isMock: true };
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { data: data ?? [], isMock: false };
}

// Lấy 1 BĐS theo id
export async function fetchProperty(id) {
  if (!supabase) {
    return { data: MOCK_PROPERTIES.find((p) => p.id === id) ?? null, isMock: true };
  }
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return { data, isMock: false };
}
