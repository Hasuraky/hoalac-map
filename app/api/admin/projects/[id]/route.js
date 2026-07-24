import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

function toPrefix(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '');
}

// PATCH: sửa dự án / bật-tắt nổi bật
export async function PATCH(request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const body = await request.json();
  const updates = {};
  if (body.name !== undefined) updates.name = (body.name ?? '').trim();
  if (body.code_prefix !== undefined) updates.code_prefix = toPrefix(body.code_prefix);
  if (body.center_lat !== undefined) updates.center_lat = body.center_lat;
  if (body.center_lng !== undefined) updates.center_lng = body.center_lng;
  if (body.zoom !== undefined) updates.zoom = body.zoom;
  if (body.is_featured !== undefined) updates.is_featured = !!body.is_featured;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Không có thay đổi.' }, { status: 400 });
  }
  const admin = adminClient();
  const { error } = await admin.from('projects').update(updates).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE: xóa dự án (BĐS trong dự án tự gỡ liên kết, thành BĐS lẻ)
export async function DELETE(_request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const admin = adminClient();
  const { error } = await admin.from('projects').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
