-- =====================================================
-- YÊU CẦU TƯ VẤN (LEADS) — khách ngoài gửi, sale xử lý
-- Chạy SAU account-management.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) default '00000000-0000-0000-0000-000000000001',

  -- Khách nhập
  full_name text not null,
  phone text not null,
  content text not null,          -- nội dung cần tư vấn
  budget text,                    -- ngân sách (chọn hoặc tự nhập)
  address text,
  property_code text,             -- mã BĐS khách quan tâm (nếu có)

  -- Vòng đời
  status text not null default 'new'
    check (status in ('new', 'assigned', 'returned', 'spam', 'converted')),
  assigned_to uuid references profiles (id),   -- sale được giao
  assigned_by uuid references profiles (id),   -- admin/owner giao
  assigned_at timestamptz,
  sale_note text,                 -- ghi chú của sale khi xử lý

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_assigned on leads (assigned_to);

-- Tự cập nhật updated_at
drop trigger if exists leads_set_updated on leads;
create trigger leads_set_updated
  before update on leads
  for each row execute function set_updated_at();

-- RLS: khách (ẩn danh) được GỬI; đọc/sửa xử lý qua API server (service_role)
alter table leads enable row level security;

drop policy if exists "anyone submit lead" on leads;
create policy "anyone submit lead" on leads
  for insert to anon, authenticated
  with check (true);

-- Không mở SELECT/UPDATE cho client thường — mọi thao tác quản lý đi qua
-- /api/admin/leads (service_role + kiểm cấp), nên client không đọc trực tiếp được.

-- =====================================================
-- LUẬT HIỂN THỊ (thực thi ở tầng API):
--   new / returned  -> admin + owner thấy (kho chung, phân được)
--   assigned        -> chỉ owner + đúng sale được giao thấy (admin bị khóa)
--   spam / converted-> chỉ owner + sale đó thấy (lưu trữ)
-- =====================================================
