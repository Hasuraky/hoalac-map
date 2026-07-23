import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

const MAX_ADMINS = 3;

// Đọc cấp hiện tại của tài khoản đích
async function getTarget(admin, id) {
  const { data } = await admin.from('profiles').select('role').eq('id', id).maybeSingle();
  return data?.role ?? null;
}

// PATCH: đổi cấp, khóa/mở khóa
export async function PATCH(request, { params }) {
  const { user: caller, role: callerRole } = await getCaller();
  if (RANK[callerRole] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const id = params.id;
  if (id === caller.id) {
    return NextResponse.json({ error: 'Không thể tự thao tác trên chính mình.' }, { status: 400 });
  }

  const admin = adminClient();
  const targetRole = await getTarget(admin, id);
  if (!targetRole) return NextResponse.json({ error: 'Không tìm thấy.' }, { status: 404 });

  // Không ai được đụng owner; admin không đụng admin khác
  if (targetRole === 'owner') {
    return NextResponse.json({ error: 'Không thể thao tác tài khoản chủ sở hữu.' }, { status: 403 });
  }
  if (callerRole === 'admin' && targetRole === 'admin') {
    return NextResponse.json({ error: 'Admin không thể sửa admin khác.' }, { status: 403 });
  }

  const body = await request.json();
  const updates = {};

  // Đổi cấp
  if (body.role) {
    if (!['user', 'sale', 'admin'].includes(body.role)) {
      return NextResponse.json({ error: 'Cấp không hợp lệ.' }, { status: 400 });
    }
    if (body.role === 'admin') {
      if (callerRole !== 'owner') {
        return NextResponse.json({ error: 'Chỉ chủ sở hữu được phong admin.' }, { status: 403 });
      }
      const { data } = await admin.rpc('count_admins');
      if ((data ?? 0) >= MAX_ADMINS) {
        return NextResponse.json({ error: `Đã đủ ${MAX_ADMINS} admin.` }, { status: 400 });
      }
    }
    if (callerRole === 'admin' && !['user', 'sale'].includes(body.role)) {
      return NextResponse.json({ error: 'Admin chỉ đặt được cấp sale/user.' }, { status: 403 });
    }
    updates.role = body.role;
  }

  // Khóa / mở khóa
  if (typeof body.is_active === 'boolean') {
    updates.is_active = body.is_active;
    await admin.auth.admin.updateUserById(id, {
      ban_duration: body.is_active ? 'none' : '87600h', // ~10 năm = khóa
    });
  }

  if (Object.keys(updates).length) {
    const { error } = await admin.from('profiles').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: xóa tài khoản
export async function DELETE(_request, { params }) {
  const { user: caller, role: callerRole } = await getCaller();
  if (RANK[callerRole] < RANK.admin) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }
  const id = params.id;
  if (id === caller.id) {
    return NextResponse.json({ error: 'Không thể tự xóa chính mình.' }, { status: 400 });
  }

  const admin = adminClient();
  const targetRole = await getTarget(admin, id);
  if (!targetRole) return NextResponse.json({ error: 'Không tìm thấy.' }, { status: 404 });
  if (targetRole === 'owner') {
    return NextResponse.json({ error: 'Không thể xóa chủ sở hữu.' }, { status: 403 });
  }
  if (callerRole === 'admin' && targetRole === 'admin') {
    return NextResponse.json({ error: 'Admin không thể xóa admin khác.' }, { status: 403 });
  }

  const { error } = await admin.auth.admin.deleteUser(id); // profiles tự xóa theo cascade
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
