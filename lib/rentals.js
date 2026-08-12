import { supabase } from './supabase';
import { fetchRole } from './properties';
import { compressImage } from './images';

// MVP 1 công ty — khớp seed.sql
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const BUCKET = 'property-images';

// Nguồn theo cấp: khách -> view rút gọn, user -> view đầy đủ trừ nội bộ, sale+ -> bảng gốc
function sourceForRole(role) {
  if (role === 'guest') return 'rentals_guest';
  if (role === 'user') return 'rentals_member';
  return 'rentals';
}

// Trạng thái tin cho thuê
export const RENTAL_STATUS = {
  available: { label: 'Còn trống', color: '#2f7d46' },
  rented: { label: 'Đã thuê', color: '#b3402f' },
  paused: { label: 'Tạm ngưng', color: '#8b877c' },
};

// Định dạng giá thuê gọn (triệu/tỷ)
export function formatRent(v) {
  if (v == null || v === '') return 'Liên hệ';
  const n = Number(v);
  if (Number.isNaN(n)) return 'Liên hệ';
  if (n >= 1e9) return (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + ' triệu';
  return n.toLocaleString('vi-VN');
}

export async function fetchRentals() {
  if (!supabase) return { data: [], isMock: true, role: 'admin' };
  const role = await fetchRole();
  const { data, error } = await supabase
    .from(sourceForRole(role))
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { data: data ?? [], isMock: false, role };
}

export async function fetchRental(id) {
  if (!supabase) return { data: null, isMock: true, role: 'admin' };
  const role = await fetchRole();
  const { data, error } = await supabase
    .from(sourceForRole(role))
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return { data, isMock: false, role };
}

export async function createRental(values) {
  if (!supabase) throw new Error('Chế độ demo — chưa kết nối Supabase, không lưu được.');
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('rentals')
    .insert({ ...values, company_id: DEFAULT_COMPANY_ID, created_by: userData?.user?.id ?? null })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw new Error(`Mã tin "${values.code}" đã tồn tại.`);
    throw error;
  }
  return data;
}

export async function updateRental(id, values) {
  if (!supabase) throw new Error('Chế độ demo — chưa kết nối Supabase, không lưu được.');
  const { data, error } = await supabase.from('rentals').update(values).eq('id', id).select().single();
  if (error) {
    if (error.code === '23505') throw new Error(`Mã tin "${values.code}" đã tồn tại ở tin khác.`);
    throw error;
  }
  return data;
}

export async function deleteRental(rental) {
  if (!supabase) throw new Error('Chế độ demo — không xóa được.');
  const paths = (rental.images || []).map(storagePathFromUrl).filter(Boolean);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from('rentals').delete().eq('id', rental.id);
  if (error) throw error;
}

// Lấy đường dẫn trong bucket từ URL công khai (để xóa file)
function storagePathFromUrl(url) {
  const m = String(url).match(/\/property-images\/(.+)$/);
  return m ? m[1] : null;
}

// Upload nhiều ảnh cho 1 tin (nén phía client), trả về danh sách URL công khai
export async function uploadRentalImages(rentalId, files, onProgress) {
  if (!supabase) throw new Error('Chế độ demo — không upload được ảnh.');
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const blob = await compressImage(files[i]);
    const path = `rentals/${rentalId}/${Date.now()}-${i}.jpg`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }
  return urls;
}
