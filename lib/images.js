import { supabase } from './supabase';

const BUCKET = 'property-images';

// URL công khai của 1 ảnh
export function imageUrl(storagePath) {
  if (!supabase || !storagePath) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// Nén ảnh phía trình duyệt: tối đa 1600px, JPEG ~82% (ảnh 8MB -> ~300KB)
export async function compressImage(file, maxDim = 1600, quality = 0.82) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    return blob ?? file;
  } catch {
    return file; // định dạng lạ -> upload nguyên bản
  }
}

// Danh sách ảnh của 1 BĐS (ảnh bìa trước)
export async function fetchImages(propertyId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('property_images')
    .select('*')
    .eq('property_id', propertyId)
    .order('is_cover', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((img) => ({ ...img, url: imageUrl(img.storage_path) }));
}

// Ảnh bìa cho danh sách BĐS: { property_id: url }
export async function fetchCovers() {
  if (!supabase) return {};
  const { data } = await supabase
    .from('property_images')
    .select('property_id, storage_path')
    .eq('is_cover', true);
  const map = {};
  for (const row of data ?? []) map[row.property_id] = imageUrl(row.storage_path);
  return map;
}

// Upload nhiều ảnh cho 1 BĐS
export async function uploadImages(propertyId, files, onProgress) {
  if (!supabase) throw new Error('Chế độ demo — không upload được ảnh.');
  const { data: existing } = await supabase
    .from('property_images')
    .select('id')
    .eq('property_id', propertyId)
    .limit(1);
  let hasCover = (existing ?? []).length > 0;

  const uploaded = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const blob = await compressImage(files[i]);
    const path = `${propertyId}/${Date.now()}-${i}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (upErr) throw upErr;

    const { data, error: dbErr } = await supabase
      .from('property_images')
      .insert({
        property_id: propertyId,
        storage_path: path,
        is_cover: !hasCover, // ảnh đầu tiên tự thành ảnh bìa
        sort_order: i,
      })
      .select()
      .single();
    if (dbErr) throw dbErr;
    hasCover = true;
    uploaded.push({ ...data, url: imageUrl(path) });
  }
  return uploaded;
}

// Xóa 1 ảnh (cả file lẫn dòng dữ liệu)
export async function deleteImage(image) {
  if (!supabase) return;
  await supabase.storage.from(BUCKET).remove([image.storage_path]);
  const { error } = await supabase.from('property_images').delete().eq('id', image.id);
  if (error) throw error;
}

// Đặt ảnh bìa
export async function setCover(propertyId, imageId) {
  if (!supabase) return;
  await supabase.from('property_images').update({ is_cover: false }).eq('property_id', propertyId);
  const { error } = await supabase
    .from('property_images')
    .update({ is_cover: true })
    .eq('id', imageId);
  if (error) throw error;
}
