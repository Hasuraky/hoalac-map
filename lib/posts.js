import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client đọc phía server (ẩn danh) — RLS chỉ trả bài đã đăng cho khách.
function db() {
  if (!URL || !ANON) return null;
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getPublishedPosts() {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from('posts')
    .select('id, slug, title, excerpt, cover_image, tags, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error) return [];
  return data ?? [];
}

export async function getPostBySlug(slug) {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();
  if (error) return null;
  return data;
}

// Markdown -> HTML (nội dung do quản trị viên tin cậy soạn)
export function mdToHtml(md) {
  return marked.parse(md || '', { breaks: true, gfm: true });
}

// Tạo slug từ tiêu đề tiếng Việt
export function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
