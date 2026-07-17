-- =====================================================
-- SCHEMA MVP - Bản đồ BĐS Hòa Lạc
-- Chạy trong Supabase Dashboard > SQL Editor
-- =====================================================

-- Công ty (MVP chỉ có 1 dòng; schema sẵn sàng cho multi-company giai đoạn 4)
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Hồ sơ người dùng (liên kết với Supabase Auth ở Bước 2)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references companies (id),
  full_name text,
  phone text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

-- Bất động sản
create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id),
  code text unique not null,             -- mã nội bộ, chống trùng lặp
  title text not null,
  type text,                             -- Đất nền / Nhà ở / Shophouse...
  status text not null default 'available'
    check (status in ('available', 'deposited', 'sold', 'inactive')),
  price numeric,                         -- VND
  area numeric,                          -- m2
  frontage numeric,                      -- mặt tiền (m)
  road_width numeric,                    -- đường trước nhà (m)
  direction text,
  legal text,                            -- Sổ đỏ / HĐMB...
  address text,
  lat double precision not null,
  lng double precision not null,
  description text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_properties_status on properties (status);
create index if not exists idx_properties_company on properties (company_id);

-- Ảnh BĐS (dùng ở Bước 4)
create table if not exists property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties (id) on delete cascade,
  storage_path text not null,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Tự cập nhật updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_properties_updated_at on properties;
create trigger trg_properties_updated_at
  before update on properties
  for each row execute function set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- Bước 1: cho phép đọc công khai để demo bản đồ.
-- Bước 2 (đăng nhập) sẽ siết lại: chỉ user đã đăng nhập mới đọc/ghi.
-- =====================================================
alter table companies enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table property_images enable row level security;

drop policy if exists "public read properties" on properties;
create policy "public read properties" on properties for select using (true);

drop policy if exists "public read property_images" on property_images;
create policy "public read property_images" on property_images for select using (true);
