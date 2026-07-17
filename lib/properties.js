import { supabase } from './supabase';
import { MOCK_PROPERTIES } from './mock-data';

// ID công ty mặc định (MVP 1 công ty — khớp seed.sql)
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

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

// Thêm BĐS mới
export async function createProperty(values) {
  if (!supabase) throw new Error('Chế độ demo — chưa kết nối Supabase, không lưu được.');
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('properties')
    .insert({
      ...values,
      company_id: DEFAULT_COMPANY_ID,
      created_by: userData?.user?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mã BĐS "${values.code}" đã tồn tại — hàng này có thể đã được nhập trước đó.`);
    }
    throw error;
  }
  return data;
}

// Cập nhật BĐS
export async function updateProperty(id, values) {
  if (!supabase) throw new Error('Chế độ demo — chưa kết nối Supabase, không lưu được.');
  const { data, error } = await supabase
    .from('properties')
    .update(values)
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new Error(`Mã BĐS "${values.code}" đã tồn tại ở một BĐS khác.`);
    }
    throw error;
  }
  return data;
}

// Khoảng cách 2 điểm (mét) — công thức haversine
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Tìm BĐS nghi trùng lặp: cách vị trí < 40m (bỏ qua chính nó khi sửa)
export function findNearbyProperties(properties, lat, lng, excludeId = null, radius = 40) {
  if (lat == null || lng == null) return [];
  return properties
    .filter((p) => p.id !== excludeId && p.lat != null && p.lng != null)
    .map((p) => ({ ...p, _distance: distanceMeters(lat, lng, p.lat, p.lng) }))
    .filter((p) => p._distance < radius)
    .sort((a, b) => a._distance - b._distance);
}
