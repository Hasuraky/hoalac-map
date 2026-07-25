import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

export async function DELETE(_request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const admin = adminClient();
  const { error } = await admin.from('region_links').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// PATCH — sửa 1 mũi tên (tọa độ đích, nhãn, độ cong)
export async function PATCH(request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const b = await request.json();
  const patch = {};
  if (b.to_lat != null) patch.to_lat = b.to_lat;
  if (b.to_lng != null) patch.to_lng = b.to_lng;
  if ('label' in b) patch.label = (b.label ?? '').trim() || null;
  if (Number.isFinite(b.curve)) patch.curve = b.curve;
  const admin = adminClient();
  const { error } = await admin.from('region_links').update(patch).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
