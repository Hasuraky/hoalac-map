-- =====================================================
-- ĐIỂM NỔI BẬT — ghim ảnh PNG (ĐH FPT, chợ, trường...) lên bản đồ
-- Chạy SAU lot-number.sql. Chạy lại nhiều lần vẫn an toàn.
-- Ảnh lưu chung bucket 'property-images'.
-- =====================================================

create table if not exists landmarks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) default '00000000-0000-0000-0000-000000000001',
  name text,
  lat double precision not null,
  lng double precision not null,
  image_path text not null,
  width_px int not null default 90,   -- cỡ hiển thị (px)
  created_at timestamptz not null default now()
);

alter table landmarks enable row level security;
drop policy if exists "public read landmarks" on landmarks;
create policy "public read landmarks" on landmarks
  for select to anon, authenticated using (true);
