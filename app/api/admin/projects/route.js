import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

// Chuẩn hóa mã rút gọn: bỏ dấu, bỏ khoảng trắng, giữ chữ-số
function toPrefix(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '');
}

// GET: danh sách dự án (admin/owner)
export async function GET() {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const admin = adminClient();
  const { data, error } = await admin.from('projects').select('*').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
}

// POST: tạo dự án
export async function POST(request) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const body = await request.json();
  const name = (body.name ?? '').trim();
  if (!name) return NextResponse.json({ error: 'Cần tên dự án.' }, { status: 400 });

  const code_prefix = toPrefix(body.code_prefix || name);
  if (!code_prefix) return NextResponse.json({ error: 'Mã rút gọn không hợp lệ.' }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.from('projects').insert({
    name,
    code_prefix,
    center_lat: body.center_lat ?? null,
    center_lng: body.center_lng ?? null,
    zoom: body.zoom ?? 16,
    is_featured: !!body.is_featured,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
