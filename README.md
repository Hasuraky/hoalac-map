# Bản đồ BĐS Hòa Lạc — MVP

Hệ thống quản lý bất động sản Hòa Lạc trên bản đồ. Giai đoạn 2 (MVP), đã xong **Bước 1** (bản đồ + marker + popup + chi tiết) và **Bước 2** (đăng nhập + bảo vệ route).

## Chạy thử ngay (không cần Supabase)

```bash
npm install
npm run dev
```

Mở http://localhost:3000 — app tự dùng dữ liệu mẫu khi chưa cấu hình Supabase.

## Kết nối Supabase (dữ liệu thật)

1. Tạo project miễn phí tại https://supabase.com
2. Vào **SQL Editor**, chạy lần lượt: `supabase/schema.sql` → `supabase/seed.sql` → `supabase/auth-policies.sql`
3. Vào **Project Settings > API**, copy `URL` và `anon key`
4. Copy `.env.example` thành `.env.local`, điền 2 giá trị trên
5. Tạo tài khoản nhân viên: **Authentication > Users > Add user** (bật Auto Confirm User)
6. Chạy lại `npm run dev` — app yêu cầu đăng nhập, marker đến từ database

Cấp quyền admin cho một user: `update profiles set role = 'admin' where id = '<user-id>';`

## Cấu trúc

```
app/page.jsx               Trang bản đồ chính
app/login/page.jsx         Trang đăng nhập
app/bds/[id]/page.jsx      Trang chi tiết BĐS
middleware.js              Chặn truy cập khi chưa đăng nhập
components/MapView.jsx     Bản đồ Leaflet + marker + popup
components/UserMenu.jsx    Hiện email + nút đăng xuất
lib/supabase.js            Client Supabase (cookie-based)
lib/properties.js          Đọc dữ liệu (Supabase hoặc mock)
lib/format.js              Định dạng giá, nhãn/màu trạng thái
supabase/schema.sql        Schema database (sẵn company_id cho multi-company)
supabase/seed.sql          Dữ liệu mẫu
supabase/auth-policies.sql RLS + tự tạo profile (Bước 2)
KE-HOACH-MVP.md            Kế hoạch đầy đủ giai đoạn 2
```

## Lộ trình còn lại

Bước 3: Form thêm/sửa BĐS · Bước 4: Upload ảnh · Bước 5: Lọc + danh sách bảng · Bước 6: Phân quyền · Bước 7: Nhập dữ liệu thật
