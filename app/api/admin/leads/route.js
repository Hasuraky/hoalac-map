import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

// GET: danh sách lead theo cấp người gọi
// - owner: tất cả
// - admin: chỉ kho chung (new / returned)
// - sale: chỉ lead được giao cho mình
export async function GET() {
  const { user, role } = await getCaller();
  if (RANK[role] < RANK.sale) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }

  const admin = adminClient();
  let query = admin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (role === 'admin') {
    query = query.in('status', ['new', 'returned']);
  } else if (role === 'sale') {
    query = query.eq('assigned_to', user.id);
  }
  // owner: không lọc

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ghép tên sale được giao
  const saleIds = [...new Set((data ?? []).map((l) => l.assigned_to).filter(Boolean))];
  const nameById = {};
  if (saleIds.length) {
    const { data: profs } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', saleIds);
    for (const p of profs ?? []) nameById[p.id] = p.full_name;
  }

  return NextResponse.json({
    role,
    leads: (data ?? []).map((l) => ({ ...l, assigned_name: nameById[l.assigned_to] ?? null })),
  });
}
