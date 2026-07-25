-- =====================================================
-- LIÊN KẾT VÙNG — mũi tên từ sản phẩm tới điểm đích, kèm text (km/phút)
-- Chạy SAU landmarks.sql. Chạy lại nhiều lần vẫn an toàn.
-- Gắn vào 1 dự án (áp cho mọi sản phẩm trong dự án) HOẶC 1 sản phẩm lẻ.
-- =====================================================

create table if not exists region_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects (id) on delete cascade,
  property_id uuid references properties (id) on delete cascade,
  to_lat double precision not null,
  to_lng double precision not null,
  label text,                       -- ví dụ: "2 km" / "5 phút tới ĐH FPT"
  created_at timestamptz not null default now()
);

create index if not exists idx_rlinks_project on region_links (project_id);
create index if not exists idx_rlinks_property on region_links (property_id);

alter table region_links enable row level security;
drop policy if exists "public read region_links" on region_links;
create policy "public read region_links" on region_links
  for select to anon, authenticated using (true);
