-- =====================================================
-- BẢNG HÀNG CHO THUÊ (rentals)
-- Nhân bản mô hình properties: bảng gốc (nhân viên) + view khách + view thành viên.
-- Chạy SAU: schema.sql, auth-policies.sql, roles-public.sql, storage-images.sql
-- (cần sẵn hàm app_role(), set_updated_at(), bucket 'property-images').
-- Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) default '00000000-0000-0000-0000-000000000001',
  code text unique not null,                 -- mã tin, chống trùng
  title text not null,
  type text,                                 -- Căn hộ / Nhà ở / Shophouse / Văn phòng...
  status text not null default 'available'
    check (status in ('available', 'rented', 'paused')),
  rent_price numeric,                        -- giá thuê / tháng (VND)
  deposit numeric,                           -- đặt cọc (VND)
  service_fee numeric,                       -- phí dịch vụ / tháng (VND)
  area numeric,                              -- m2
  bedrooms int,
  bathrooms int,
  furniture text,                            -- Nội thất: đầy đủ / cơ bản / trống
  direction text,
  district text,                             -- khu vực hiển thị công khai
  address text,                              -- địa chỉ đầy đủ (chỉ đăng nhập)
  description text,                          -- mô tả công khai
  images text[] not null default '{}',       -- danh sách URL ảnh (ảnh đầu = bìa)
  lat double precision,
  lng double precision,
  -- ===== TRƯỜNG NỘI BỘ (chỉ nhân viên sale+ đọc bảng gốc mới thấy) =====
  owner_name text,                           -- tên chủ nhà
  owner_phone text,                          -- liên hệ chủ nhà
  base_price numeric,                        -- giá gốc chủ nhà
  commission text,                           -- hoa hồng / phí
  internal_note text,                        -- ghi chú nội bộ
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rentals_status on rentals (status);
create index if not exists idx_rentals_company on rentals (company_id);

-- Bổ sung cột phí dịch vụ nếu bảng đã tạo từ trước
alter table rentals add column if not exists service_fee numeric;

-- Tự cập nhật updated_at (dùng lại hàm set_updated_at từ schema.sql)
drop trigger if exists trg_rentals_updated_at on rentals;
create trigger trg_rentals_updated_at
  before update on rentals
  for each row execute function set_updated_at();

-- =====================================================
-- VIEW công khai (khách chưa đăng nhập): thông tin cơ bản + ảnh
-- =====================================================
drop view if exists rentals_guest;
create view rentals_guest as
  select id, code, title, type, status, rent_price, deposit, service_fee, area,
         bedrooms, bathrooms, furniture, direction, district, description,
         images, created_at
  from rentals;

grant select on rentals_guest to anon, authenticated;

-- =====================================================
-- VIEW thành viên đăng nhập: đầy đủ TRỪ trường nội bộ
-- =====================================================
drop view if exists rentals_member;
create view rentals_member as
  select id, code, title, type, status, rent_price, deposit, service_fee, area,
         bedrooms, bathrooms, furniture, direction, district, description,
         images, address, lat, lng, created_at, updated_at
  from rentals;

revoke all on rentals_member from anon;
grant select on rentals_member to authenticated;

-- =====================================================
-- ROW LEVEL SECURITY trên bảng gốc: chỉ sale+ đọc trực tiếp (thấy trường nội bộ),
-- admin/owner mới thêm/sửa/xóa.
-- =====================================================
alter table rentals enable row level security;

drop policy if exists "staff read rentals" on rentals;
create policy "staff read rentals" on rentals
  for select to authenticated
  using (app_role() in ('sale', 'admin', 'owner'));

drop policy if exists "admin insert rentals" on rentals;
create policy "admin insert rentals" on rentals
  for insert to authenticated
  with check (app_role() in ('admin', 'owner'));

drop policy if exists "admin update rentals" on rentals;
create policy "admin update rentals" on rentals
  for update to authenticated
  using (app_role() in ('admin', 'owner'));

drop policy if exists "admin delete rentals" on rentals;
create policy "admin delete rentals" on rentals
  for delete to authenticated
  using (app_role() in ('admin', 'owner'));

-- Ảnh cho thuê dùng chung bucket 'property-images' (đã có policy public read + admin write).
-- Lưu file dưới tiền tố rentals/<id>/... , URL công khai lưu trong cột rentals.images.
