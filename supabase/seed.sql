-- =====================================================
-- DỮ LIỆU MẪU - chạy SAU schema.sql
-- =====================================================

insert into companies (id, name)
values ('00000000-0000-0000-0000-000000000001', 'Công ty BĐS Hòa Lạc')
on conflict (id) do nothing;

insert into properties
  (company_id, code, title, type, status, price, area, frontage, road_width, direction, legal, address, lat, lng, description)
values
  ('00000000-0000-0000-0000-000000000001', 'HL-001', 'Đất nền 100m2 gần Đại học FPT', 'Đất nền', 'available', 3200000000, 100, 5, 8, 'Đông Nam', 'Sổ đỏ', 'Thạch Hòa, Thạch Thất, Hà Nội', 21.0125, 105.5254, 'Lô góc, gần cổng Đại học FPT, đường ô tô tránh nhau.'),
  ('00000000-0000-0000-0000-000000000001', 'HL-002', 'Đất 120m2 khu CNC Hòa Lạc', 'Đất nền', 'deposited', 4100000000, 120, 6, 10, 'Nam', 'Sổ đỏ', 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội', 21.0043, 105.5178, 'Sát khu công nghệ cao, phù hợp đầu tư dài hạn.'),
  ('00000000-0000-0000-0000-000000000001', 'HL-003', 'Nhà 3 tầng 80m2 Bình Yên', 'Nhà ở', 'available', 5500000000, 80, 4.5, 6, 'Tây Bắc', 'Sổ đỏ', 'Bình Yên, Thạch Thất, Hà Nội', 21.0201, 105.5391, 'Nhà xây mới, full nội thất, gần chợ Bình Yên.'),
  ('00000000-0000-0000-0000-000000000001', 'HL-004', 'Đất 200m2 mặt đường DH09', 'Đất nền', 'sold', 7800000000, 200, 8, 12, 'Đông', 'Sổ đỏ', 'Tân Xã, Thạch Thất, Hà Nội', 21.0158, 105.5462, 'Mặt đường kinh doanh, đã bán tháng 6/2026.'),
  ('00000000-0000-0000-0000-000000000001', 'HL-005', 'Shophouse 90m2 gần Vin Hòa Lạc', 'Shophouse', 'available', 9200000000, 90, 6, 15, 'Nam', 'HĐMB', 'Đồng Trúc, Thạch Thất, Hà Nội', 20.9967, 105.5312, 'Vị trí kinh doanh, dòng tiền cho thuê tốt.'),
  ('00000000-0000-0000-0000-000000000001', 'HL-006', 'Đất 150m2 Cổ Đông, Sơn Tây', 'Đất nền', 'inactive', 3900000000, 150, 7, 5, 'Bắc', 'Sổ đỏ', 'Cổ Đông, Sơn Tây, Hà Nội', 21.0289, 105.5127, 'Chủ tạm ngừng bán, chờ giá.')
on conflict (code) do nothing;
