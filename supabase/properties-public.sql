-- =====================================================
-- MỞ ĐẦY ĐỦ THÔNG TIN BĐS BÁN CHO KHÁCH (chưa đăng nhập)
-- Khách xem được giá, địa chỉ, thông số, mô tả... như thành viên.
-- (Bảng properties không có trường "nội bộ" riêng nên mở công khai an toàn.)
-- Chạy SAU lot-number.sql. Chạy lại nhiều lần vẫn an toàn.
-- =====================================================

drop view if exists properties_guest;
create view properties_guest as
  select id, code, title, type, status, price, area, frontage, road_width,
         direction, legal, address, description, lat, lng, project_id, lot_number,
         created_at, updated_at
  from properties;

grant select on properties_guest to anon, authenticated;
