import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Bảo vệ route: chưa đăng nhập -> chuyển về /login.
// Chưa cấu hình Supabase (chế độ demo) -> cho qua tất cả.
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() xác thực với server Supabase (an toàn hơn getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname.startsWith('/login');

  // Khách được xem bản đồ + trang chi tiết.
  // Bắt đăng nhập ở trang thêm/sửa BĐS và trang quản trị.
  const needsAuth =
    pathname === '/bds/moi' ||
    pathname.endsWith('/sua') ||
    pathname.endsWith('/so-do') ||
    pathname.startsWith('/quan-tri') ||
    pathname.startsWith('/tu-van');

  if (!user && needsAuth) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Bỏ qua file tĩnh của Next.js
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
