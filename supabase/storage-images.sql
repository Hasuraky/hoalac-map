-- =====================================================
-- BƯỚC 4: KHO ẢNH BĐS (Supabase Storage + bảng property_images)
-- Chạy SAU roles-public.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

-- 1) Tạo bucket công khai chứa ảnh
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

-- 2) Quyền trên file ảnh: ai cũng xem được, admin+ mới upload/xóa
drop policy if exists "public read property images" on storage.objects;
create policy "public read property images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'property-images');

drop policy if exists "admin upload property images" on storage.objects;
create policy "admin upload property images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images' and app_role() in ('admin', 'owner'));

drop policy if exists "admin delete property images" on storage.objects;
create policy "admin delete property images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-images' and app_role() in ('admin', 'owner'));

-- 3) Bảng property_images: khách cũng xem được (ảnh là thông tin công khai)
drop policy if exists "auth read property_images" on property_images;
drop policy if exists "public read property_images" on property_images;
create policy "public read property_images" on property_images
  for select to anon, authenticated
  using (true);

-- Admin+ được sửa (đổi ảnh bìa, thứ tự)
drop policy if exists "admin update property_images" on property_images;
create policy "admin update property_images" on property_images
  for update to authenticated
  using (app_role() in ('admin', 'owner'));
