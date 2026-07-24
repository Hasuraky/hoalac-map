-- =====================================================
-- SƠ ĐỒ DỰ ÁN — đè ảnh thiết kế lên khu dự án trên bản đồ
-- Chạy SAU projects.sql. Chạy lại nhiều lần vẫn an toàn.
-- Ảnh lưu chung bucket 'property-images' (đã public + policy admin ghi).
-- =====================================================

alter table projects add column if not exists overlay_path text;       -- đường dẫn ảnh trong storage
alter table projects add column if not exists overlay_coords jsonb;     -- 4 góc [[lng,lat] TL,TR,BR,BL]
alter table projects add column if not exists overlay_opacity real default 0.85;
