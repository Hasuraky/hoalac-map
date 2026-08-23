-- =====================================================
-- BLOG / BÀI VIẾT (posts)
-- Công khai đọc bài ĐÃ ĐĂNG; admin/owner viết/sửa; nhân viên xem cả nháp.
-- Chạy SAU roles-public.sql (cần app_role(), set_updated_at()).
-- Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) default '00000000-0000-0000-0000-000000000001',
  slug text unique not null,               -- đường dẫn: /blog/<slug>
  title text not null,
  excerpt text,                            -- mô tả ngắn (dùng cho SEO + thẻ preview)
  content text,                            -- nội dung (Markdown)
  cover_image text,                        -- URL ảnh bìa
  tags text[] not null default '{}',       -- vd: {Xanh Villas, Hòa Lạc}
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_posts_published on posts (published, published_at desc);
create index if not exists idx_posts_slug on posts (slug);

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
  before update on posts
  for each row execute function set_updated_at();

alter table posts enable row level security;

-- Đọc: ai cũng đọc bài đã đăng; nhân viên (sale+) đọc cả bản nháp
drop policy if exists "read posts" on posts;
create policy "read posts" on posts
  for select to anon, authenticated
  using (published or app_role() in ('sale', 'admin', 'owner'));

-- Viết: chỉ admin/owner
drop policy if exists "admin insert posts" on posts;
create policy "admin insert posts" on posts
  for insert to authenticated
  with check (app_role() in ('admin', 'owner'));

drop policy if exists "admin update posts" on posts;
create policy "admin update posts" on posts
  for update to authenticated
  using (app_role() in ('admin', 'owner'));

drop policy if exists "admin delete posts" on posts;
create policy "admin delete posts" on posts
  for delete to authenticated
  using (app_role() in ('admin', 'owner'));

-- =====================================================
-- LƯỢT XEM: cột đếm + hàm tăng an toàn (khách gọi được, chỉ tăng bài đã đăng)
-- =====================================================
alter table posts add column if not exists views bigint not null default 0;

create or replace function increment_post_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update posts set views = views + 1 where slug = p_slug and published;
$$;

grant execute on function increment_post_views(text) to anon, authenticated;

-- Ảnh bài viết dùng chung bucket 'property-images' (đã có policy public read + admin write),
-- lưu dưới tiền tố blog/... ; URL công khai lưu ở cột cover_image / trong nội dung.
