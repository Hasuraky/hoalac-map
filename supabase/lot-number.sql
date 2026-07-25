-- =====================================================
-- SỐ LÔ — nhãn ngắn của BĐS trong dự án, khớp với id hình trong SVG
-- Chạy SAU project-overlay.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

alter table properties add column if not exists lot_number text; -- ví dụ: A5-06

-- Đưa lot_number vào các view (thêm ở CUỐI để create-or-replace không lỗi đổi tên cột)
drop view if exists properties_guest;
create view properties_guest as
  select id, code, title, type, status, area, lat, lng, project_id, lot_number, created_at
  from properties;
grant select on properties_guest to anon, authenticated;

drop view if exists properties_member;
create view properties_member as
  select id, code, title, type, status, price, area, frontage, road_width,
         direction, legal, address, lat, lng, project_id, lot_number, created_at, updated_at
  from properties;
revoke all on properties_member from anon;
grant select on properties_member to authenticated;
