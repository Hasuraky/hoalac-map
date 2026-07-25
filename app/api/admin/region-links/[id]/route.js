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
