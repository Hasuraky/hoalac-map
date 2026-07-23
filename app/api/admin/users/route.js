import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const MAX_ADMINS = 3;

// GET: danh sách tài khoản (admin/owner)
export async function GET() {
  const { role } = await getCaller();
  if (RANK[role] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }

  const admin = adminClient();
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, role, is_active, created_at')
    .order('role', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ghép email từ Auth
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = {};
  for (const u of list?.users ?? []) emailById[u.id] = u.email;

  return NextResponse.json({
    users: (profiles ?? []).map((p) => ({ ...p, email: emailById[p.id] ?? null })),
  });
}

// POST: tạo tài khoản mới
export async function POST(request) {
  const { role: callerRole } = await getCaller();
  if (RANK[callerRole] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }

  const body = await request.json();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const full_name = (body.full_name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const newRole = body.role ?? 'sale';

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: 'Cần email và mật khẩu ít nhất 6 ký tự.' },
      { status: 400 }
    );
  }
  if (!['user', 'sale', 'admin'].includes(newRole)) {
    return NextResponse.json({ error: 'Cấp tài khoản không hợp lệ.' }, { status: 400 });
  }
  // Chỉ owner được tạo admin, và không vượt 3 admin
  if (newRole === 'admin') {
    if (callerRole !== 'owner') {
      return NextResponse.json({ error: 'Chỉ chủ sở hữu được tạo admin.' }, { status: 403 });
    }
    const admin0 = adminClient();
    const { data } = await admin0.rpc('count_admins');
    if ((data ?? 0) >= MAX_ADMINS) {
      return NextResponse.json({ error: `Đã đủ ${MAX_ADMINS} admin.` }, { status: 400 });
    }
  }

  const admin = adminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // Cập nhật hồ sơ (trigger đã tạo dòng profiles, giờ set đúng cấp + thông tin)
  const { error: upErr } = await admin
    .from('profiles')
    .update({ role: newRole, full_name: full_name || email, phone, company_id: DEFAULT_COMPANY_ID })
    .eq('id', created.user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: created.user.id });
}
