-- =====================================================
-- PHÂN QUYỀN ĐỢT 1: owner / admin / sale / user + khách xem công khai
-- Chạy SAU auth-policies.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

-- 1) Mở rộng cấp tài khoản
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'sale', 'user'));

-- Nhân viên cũ (staff) chuyển thành sale
update profiles set role = 'sale' where role = 'staff';

-- Tài khoản mới mặc định là user thường
alter table profiles alter column role set default 'user';

-- 2) Hàm đọc cấp của người gọi hiện tại (security definer để tránh vòng lặp RLS)
create or replace function app_role()
returns text
language sql stable security definer set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()), 'guest')
$$;

-- 3) View KHÁCH (không đăng nhập): chỉ thông tin cơ bản
create or replace view properties_guest as
  select id, code, title, type, status, area, lat, lng, created_at
  from properties;

grant select on properties_guest to anon, authenticated;

-- 4) View NGƯỜI DÙNG đăng nhập: đầy đủ trừ mô tả/ghi chú nội bộ
create or replace view properties_member as
  select id, code, title, type, status, price, area, frontage, road_width,
         direction, legal, address, lat, lng, created_at, updated_at
  from properties;

revoke all on properties_member from anon;
grant select on properties_member to authenticated;

-- 5) Siết lại bảng gốc: chỉ sale trở lên đọc trực tiếp
drop policy if exists "auth read properties" on properties;
create policy "staff read properties" on properties
  for select to authenticated
  using (app_role() in ('sale', 'admin', 'owner'));

-- Thêm/sửa/xóa: chỉ admin và owner
drop policy if exists "auth insert properties" on properties;
create policy "admin insert properties" on properties
  for insert to authenticated
  with check (app_role() in ('admin', 'owner'));

drop policy if exists "auth update properties" on properties;
create policy "admin update properties" on properties
  for update to authenticated
  using (app_role() in ('admin', 'owner'));

drop policy if exists "admin delete properties" on properties;
create policy "admin delete properties" on properties
  for delete to authenticated
  using (app_role() in ('admin', 'owner'));

-- Ảnh: đọc cho mọi người đăng nhập, ghi/xóa cho admin+
drop policy if exists "auth insert property_images" on property_images;
create policy "admin insert property_images" on property_images
  for insert to authenticated
  with check (app_role() in ('admin', 'owner'));

drop policy if exists "auth delete property_images" on property_images;
create policy "admin delete property_images" on property_images
  for delete to authenticated
  using (app_role() in ('admin', 'owner'));

-- =====================================================
-- SAU KHI CHẠY: tự phong tài khoản của bạn làm OWNER (admin 0):
--   update profiles set role = 'owner'
--   where id = (select id from auth.users where email = 'EMAIL_CUA_BAN');
-- Phong admin (tối đa 3):
--   update profiles set role = 'admin' where id = '<user-id>';
-- =====================================================
