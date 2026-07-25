import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

// GET ?project=.. hoặc ?property=.. — liệt kê liên kết vùng để quản lý
export async function GET(request) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const admin = adminClient();
  let q = admin.from('region_links').select('*').order('created_at');
  if (searchParams.get('project')) q = q.eq('project_id', searchParams.get('project'));
  else if (searchParams.get('property')) q = q.eq('property_id', searchParams.get('property'));
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data ?? [] });
}

// POST — thêm 1 mũi tên (gắn project_id hoặc property_id)
export async function POST(request) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const b = await request.json();
  if (b.to_lat == null || b.to_lng == null) return NextResponse.json({ error: 'Cần tọa độ điểm đích.' }, { status: 400 });
  if (!b.project_id && !b.property_id) return NextResponse.json({ error: 'Thiếu dự án/sản phẩm.' }, { status: 400 });
  const admin = adminClient();
  const { error } = await admin.from('region_links').insert({
    project_id: b.project_id ?? null,
    property_id: b.property_id ?? null,
    to_lat: b.to_lat,
    to_lng: b.to_lng,
    label: (b.label ?? '').trim() || null,
    curve: Number.isFinite(b.curve) ? b.curve : 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
