-- =====================================================
-- ĐỢT 2: QUẢN LÝ TÀI KHOẢN (owner/admin quản lý cấp thấp hơn)
-- Chạy SAU roles-public.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

-- 1) Bổ sung cột hồ sơ
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists is_active boolean not null default true;
alter table profiles add column if not exists created_by uuid references profiles (id);

-- 2) Owner & admin đọc được TẤT CẢ hồ sơ (để quản lý)
drop policy if exists "auth read profiles" on profiles;
create policy "read profiles" on profiles
  for select to authenticated
  using (
    id = auth.uid()                       -- luôn đọc được hồ sơ của mình
    or app_role() in ('admin', 'owner')   -- admin/owner đọc mọi hồ sơ
  );

-- 3) Owner sửa mọi hồ sơ; admin sửa hồ sơ cấp sale/user (không đụng admin/owner)
drop policy if exists "own update profile" on profiles;
drop policy if exists "manage profiles" on profiles;
create policy "manage profiles" on profiles
  for update to authenticated
  using (
    (id = auth.uid())                                   -- tự sửa hồ sơ mình
    or (app_role() = 'owner')                           -- owner: toàn quyền
    or (app_role() = 'admin' and role in ('sale', 'user'))  -- admin: cấp thấp
  );

-- 4) Đếm số admin hiện có (dùng để chặn vượt 3 admin)
create or replace function count_admins()
returns int
language sql stable security definer set search_path = public
as $$
  select count(*)::int from profiles where role = 'admin'
$$;

-- =====================================================
-- GHI CHÚ:
-- - Tạo/xóa tài khoản Auth phải chạy phía server (service_role key),
--   xử lý trong /api/admin/users. RLS ở đây chỉ quản bảng profiles.
-- - Giới hạn tối đa 3 admin được kiểm ở tầng API.
-- =====================================================
