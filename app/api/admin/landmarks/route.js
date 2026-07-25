import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

export async function GET() {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const admin = adminClient();
  const { data, error } = await admin.from('landmarks').select('*').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ landmarks: data ?? [] });
}

export async function POST(request) {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  const b = await request.json();
  if (b.lat == null || b.lng == null || !b.image_path) {
    return NextResponse.json({ error: 'Cần tọa độ và ảnh.' }, { status: 400 });
  }
  const admin = adminClient();
  const { error } = await admin.from('landmarks').insert({
    name: (b.name ?? '').trim() || null,
    lat: b.lat,
    lng: b.lng,
    image_path: b.image_path,
    width_px: b.width_px ?? 90,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
