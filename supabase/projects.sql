-- =====================================================
-- DỰ ÁN — nhóm BĐS theo dự án, mã có tên dự án, dự án nổi bật
-- Chạy SAU leads.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) default '00000000-0000-0000-0000-000000000001',
  name text not null,               -- tên hiển thị: "Xanh Villas"
  code_prefix text not null,        -- mã rút gọn dùng trong mã BĐS: "XanhVillas"
  center_lat double precision,      -- tâm dự án (để bay tới)
  center_lng double precision,
  zoom int default 16,              -- mức zoom khi bay tới
  is_featured boolean not null default false,  -- nổi bật -> hiện ở bộ lọc
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_featured on projects (is_featured);

-- Gắn BĐS vào dự án (null = BĐS lẻ)
alter table properties add column if not exists project_id uuid references projects (id) on delete set null;
create index if not exists idx_properties_project on properties (project_id);

-- Đưa project_id vào các view. Drop trước để đổi được thứ tự/thêm cột an toàn.
drop view if exists properties_guest;
create view properties_guest as
  select id, code, title, type, status, area, lat, lng, project_id, created_at
  from properties;
grant select on properties_guest to anon, authenticated;

drop view if exists properties_member;
create view properties_member as
  select id, code, title, type, status, price, area, frontage, road_width,
         direction, legal, address, lat, lng, project_id, created_at, updated_at
  from properties;
revoke all on properties_member from anon;
grant select on properties_member to authenticated;

-- RLS: ai cũng đọc được danh sách dự án; thêm/sửa/xóa qua API server
alter table projects enable row level security;
drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects
  for select to anon, authenticated using (true);

-- Đếm số BĐS trong 1 dự án (để sinh số thứ tự)
create or replace function next_project_seq(p_project uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select coalesce(max(
    (regexp_match(code, '-(\d+)$'))[1]::int
  ), 0) + 1
  from properties where project_id = p_project
$$;
