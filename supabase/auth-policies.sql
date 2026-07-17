-- =====================================================
-- BƯỚC 2: SIẾT ROW LEVEL SECURITY + TỰ TẠO PROFILE
-- Chạy SAU schema.sql và seed.sql
-- =====================================================

-- 1) Bỏ quyền đọc công khai của Bước 1
drop policy if exists "public read properties" on properties;
drop policy if exists "public read property_images" on property_images;

-- 2) Chỉ user đã đăng nhập được đọc/ghi
-- (MVP 1 công ty: mọi user đăng nhập thấy chung bảng hàng.
--  Giai đoạn 4 multi-company sẽ thêm điều kiện company_id.)

drop policy if exists "auth read companies" on companies;
create policy "auth read companies" on companies
  for select to authenticated using (true);

drop policy if exists "auth read profiles" on profiles;
create policy "auth read profiles" on profiles
  for select to authenticated using (true);

drop policy if exists "own update profile" on profiles;
create policy "own update profile" on profiles
  for update to authenticated using (auth.uid() = id);

drop policy if exists "auth read properties" on properties;
create policy "auth read properties" on properties
  for select to authenticated using (true);

drop policy if exists "auth insert properties" on properties;
create policy "auth insert properties" on properties
  for insert to authenticated with check (true);

drop policy if exists "auth update properties" on properties;
create policy "auth update properties" on properties
  for update to authenticated using (true);

drop policy if exists "auth read property_images" on property_images;
create policy "auth read property_images" on property_images
  for select to authenticated using (true);

drop policy if exists "auth insert property_images" on property_images;
create policy "auth insert property_images" on property_images
  for insert to authenticated with check (true);

drop policy if exists "auth delete property_images" on property_images;
create policy "auth delete property_images" on property_images
  for delete to authenticated using (true);

-- 3) Tự tạo profile khi admin thêm user mới trong Supabase Auth
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, company_id, full_name, role)
  values (
    new.id,
    '00000000-0000-0000-0000-000000000001',  -- công ty mặc định (MVP 1 công ty)
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================
-- CÁCH TẠO TÀI KHOẢN NHÂN VIÊN (MVP chưa cho tự đăng ký):
-- Supabase Dashboard > Authentication > Users > Add user
-- > Create new user > điền email + mật khẩu > Auto Confirm User
-- Muốn cấp quyền admin:
--   update profiles set role = 'admin' where id = '<user-id>';
-- =====================================================
