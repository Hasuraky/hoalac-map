import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

export async function PATCH(request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const b = await request.json();
  const updates = {};
  ['name', 'lat', 'lng', 'image_path', 'width_px'].forEach((k) => {
    if (b[k] !== undefined) updates[k] = b[k];
  });
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'Không có thay đổi.' }, { status: 400 });
  const admin = adminClient();
  const { error } = await admin.from('landmarks').update(updates).eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const admin = adminClient();
  const { error } = await admin.from('landmarks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
