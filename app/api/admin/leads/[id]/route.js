import { NextResponse } from 'next/server';
import { adminClient, getCaller, RANK } from '@/lib/supabase-admin';

// PATCH: phân sale (admin/owner) hoặc đổi trạng thái (sale/owner)
export async function PATCH(request, { params }) {
  const { user, role } = await getCaller();
  if (RANK[role] < RANK.sale) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 403 });
  }

  const id = params.id;
  const admin = adminClient();
  const { data: lead } = await admin.from('leads').select('*').eq('id', id).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Không tìm thấy.' }, { status: 404 });

  const body = await request.json();
  const updates = {};

  // 1) Phân cho sale — chỉ admin/owner, chỉ khi lead ở kho chung
  if (body.assigned_to !== undefined) {
    if (RANK[role] < RANK.admin) {
      return NextResponse.json({ error: 'Chỉ admin/owner được phân lead.' }, { status: 403 });
    }
    if (!['new', 'returned'].includes(lead.status)) {
      return NextResponse.json(
        { error: 'Lead đang được sale xử lý — không phân lại được cho đến khi trả về kho.' },
        { status: 400 }
      );
    }
    // Kiểm tra người nhận là sale hợp lệ
    const { data: target } = await admin
      .from('profiles')
      .select('role')
      .eq('id', body.assigned_to)
      .maybeSingle();
    if (!target || !['sale', 'admin', 'owner'].includes(target.role)) {
      return NextResponse.json({ error: 'Người nhận không hợp lệ.' }, { status: 400 });
    }
    updates.assigned_to = body.assigned_to;
    updates.assigned_by = user.id;
    updates.assigned_at = new Date().toISOString();
    updates.status = 'assigned';
  }

  // 2) Đổi trạng thái xử lý — sale (của mình) hoặc owner
  if (body.status !== undefined) {
    const allowed = ['assigned', 'returned', 'spam', 'converted'];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }
    const isOwnSale = role === 'sale' && lead.assigned_to === user.id;
    if (role !== 'owner' && !isOwnSale) {
      return NextResponse.json({ error: 'Chỉ sale phụ trách hoặc owner được đổi trạng thái.' }, { status: 403 });
    }
    updates.status = body.status;
    // Trả về kho -> gỡ gán
    if (body.status === 'returned') {
      updates.assigned_to = null;
      updates.assigned_by = null;
      updates.assigned_at = null;
    }
  }

  if (body.sale_note !== undefined) {
    const isOwnSale = role === 'sale' && lead.assigned_to === user.id;
    if (role === 'owner' || isOwnSale) updates.sale_note = (body.sale_note ?? '').trim() || null;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Không có thay đổi.' }, { status: 400 });
  }

  const { error } = await admin.from('leads').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
