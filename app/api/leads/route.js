import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase-admin';

// POST công khai: khách ngoài gửi yêu cầu tư vấn (không cần đăng nhập)
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 });
  }

  const full_name = (body.full_name ?? '').trim();
  const phone = (body.phone ?? '').trim();
  const content = (body.content ?? '').trim();

  if (!full_name || !phone || !content) {
    return NextResponse.json(
      { error: 'Vui lòng nhập họ tên, số điện thoại và nội dung cần tư vấn.' },
      { status: 400 }
    );
  }
  if (!/^[0-9+\s().-]{8,15}$/.test(phone)) {
    return NextResponse.json({ error: 'Số điện thoại không hợp lệ.' }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin.from('leads').insert({
    full_name,
    phone,
    content,
    budget: (body.budget ?? '').trim() || null,
    address: (body.address ?? '').trim() || null,
    property_code: (body.property_code ?? '').trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
