import { supabase } from './supabase';

const BUCKET = 'property-images';

// URL công khai của ảnh sơ đồ
export function overlayUrl(path) {
  if (!supabase || !path) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Ảnh để HIỂN THỊ trên bản đồ. PNG/JPG giữ nguyên; SVG được chuyển thành PNG
// (Goong/Mapbox không vẽ được SVG trực tiếp làm image source).
export async function toDisplayImage(url) {
  if (!url) return null;
  const clean = url.split('?')[0].toLowerCase();
  if (!clean.endsWith('.svg')) return url;

  let svgText;
  try {
    svgText = await fetch(url).then((r) => r.text());
  } catch {
    return url;
  }

  // Kích thước từ viewBox (hoặc width/height)
  let w = 1000, h = 1000;
  const vb = svgText.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/);
  if (vb) {
    const v = vb[1].trim().split(/[\s,]+/).map(Number);
    if (v.length === 4) { w = v[2]; h = v[3]; }
  }
  // Đảm bảo svg có width/height để trình duyệt rasterize được
  if (!/<svg[^>]*\bwidth=/.test(svgText)) {
    svgText = svgText.replace(/<svg/, `<svg width="${w}" height="${h}"`);
  }

  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = blobUrl;
    });
    // SVG là vector -> render cạnh dài nhất = maxDim để nét khi zoom sâu (cho phép phóng to).
    // 4096 được hầu hết thiết bị hỗ trợ (giới hạn texture GPU).
    const maxDim = 4096;
    const scale = (maxDim / Math.max(w, h)) || 1;
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cw, ch);
    return canvas.toDataURL('image/png');
  } catch {
    return url;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
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
