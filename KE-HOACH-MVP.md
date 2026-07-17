# Kế hoạch Giai đoạn 2 — MVP (Sử dụng nội bộ)

## 1. Mục tiêu

Đội kinh doanh nội bộ dùng hệ thống thay Excel/Zalo: đăng nhập, xem bảng hàng trên bản đồ, thêm/sửa BĐS, upload ảnh. Thành công = môi giới tìm BĐS nhanh hơn Excel.

## 2. Phạm vi

**Có trong MVP:**

- Đăng nhập bằng email/mật khẩu (admin tạo tài khoản, chưa cho tự đăng ký)
- Bản đồ Hòa Lạc + Marker + Popup + trang chi tiết (kế thừa ý tưởng PoC)
- CRUD bất động sản: thêm mới bằng cách chấm điểm trên bản đồ, sửa, ẩn/xóa
- Trạng thái BĐS: `còn hàng / đã cọc / đã bán / ngừng bán`
- Upload và quản lý nhiều ảnh mỗi BĐS, chọn ảnh đại diện
- Tìm kiếm + lọc trên bản đồ: giá, diện tích, loại hình, trạng thái, mặt đường
- Danh sách dạng bảng (song song với bản đồ) để nhập liệu nhanh

**KHÔNG có trong MVP (đúng nguyên tắc "chỉ build khi cần"):**

- Phân quyền chi tiết (chỉ 2 vai trò: admin và nhân viên)
- Multi-company, chia sẻ bảng hàng — chỉ thiết kế schema sẵn
- Import Excel hàng loạt → để Pilot, khi dữ liệu đã chuẩn hóa
- Thống kê, lịch sử giá, CRM

## 3. Stack đề xuất

| Thành phần | Đề xuất | Lý do |
|---|---|---|
| Frontend | **Next.js + React** | 1 codebase cho cả trang bản đồ và trang quản trị; deploy Vercel miễn phí |
| Bản đồ | **Leaflet + OpenStreetMap** | Miễn phí, đủ tốt cho phạm vi Hòa Lạc; tránh phí Google Maps |
| Backend + DB | **Supabase (PostgreSQL)** | Có sẵn Auth, Storage ảnh, API — gần như không phải viết backend; Postgres hỗ trợ dữ liệu địa lý |
| Auth | Supabase Auth (email/password) | Tích hợp sẵn, có Row Level Security cho multi-company sau này |
| Lưu ảnh | Supabase Storage | Cùng hệ, có CDN, resize được qua URL |
| Hosting | Vercel + Supabase free tier | 0 đồng ở quy mô nội bộ |

**Trade-off:** Supabase khóa mình vào hệ sinh thái của họ, nhưng đổi lại tiết kiệm ~70% công viết backend. Với đội 1 người phát triển và giai đoạn MVP, đây là lựa chọn hợp lý; dữ liệu là Postgres chuẩn nên xuất ra được bất cứ lúc nào.

## 4. Schema dữ liệu

Thiết kế có sẵn `company_id` để lên Multi-company không phải sửa lại.

```sql
-- Công ty (MVP chỉ có 1 dòng, nhưng schema sẵn sàng cho giai đoạn 4)
companies (
  id uuid PK,
  name text,
  created_at timestamptz
)

-- Người dùng (liên kết Supabase Auth)
profiles (
  id uuid PK,              -- = auth.users.id
  company_id uuid FK,
  full_name text,
  phone text,
  role text CHECK (role IN ('admin','staff')),
  created_at timestamptz
)

-- Bất động sản
properties (
  id uuid PK,
  company_id uuid FK,      -- sẵn sàng multi-company
  code text UNIQUE,        -- mã BĐS nội bộ, chống trùng
  title text,
  type text,               -- đất nền / nhà / shophouse...
  status text CHECK (status IN ('available','deposited','sold','inactive')),
  price numeric,           -- VND
  area numeric,            -- m2
  frontage numeric,        -- mặt tiền (m)
  road_width numeric,      -- đường trước nhà (m)
  direction text,          -- hướng
  legal text,              -- pháp lý: sổ đỏ / HĐMB...
  address text,
  lat double precision,
  lng double precision,
  description text,
  created_by uuid FK,
  created_at timestamptz,
  updated_at timestamptz
)

-- Ảnh
property_images (
  id uuid PK,
  property_id uuid FK ON DELETE CASCADE,
  storage_path text,
  is_cover boolean DEFAULT false,
  sort_order int,
  created_at timestamptz
)
```

**Chống trùng lặp:** ràng buộc `code` UNIQUE + khi thêm mới, cảnh báo nếu có BĐS khác trong bán kính ~30m cùng diện tích.

## 5. Màn hình

1. **Đăng nhập** — email/mật khẩu.
2. **Bản đồ chính** (màn hình trung tâm) — marker màu theo trạng thái, panel lọc bên trái, popup xem nhanh, click mở chi tiết.
3. **Chi tiết BĐS** — full thông tin + gallery ảnh + nút Sửa.
4. **Form thêm/sửa** — bước 1 chấm vị trí trên bản đồ, bước 2 nhập thông tin, bước 3 upload ảnh. Tối đa 2 phút/BĐS.
5. **Danh sách bảng** — dạng bảng giống Excel để dân kinh doanh không bỡ ngỡ, có tìm kiếm, click dòng → bay đến vị trí trên bản đồ.

## 6. Thứ tự triển khai

| Bước | Nội dung | Kết quả kiểm chứng |
|---|---|---|
| 1 | Dựng project Next.js + Supabase, schema, seed vài BĐS mẫu | Bản đồ hiện marker từ database thật |
| 2 | Đăng nhập + bảo vệ route | Chưa đăng nhập không xem được |
| 3 | Form thêm/sửa BĐS (chấm điểm bản đồ) | Nhân viên tự thêm được BĐS |
| 4 | Upload + quản lý ảnh | BĐS có gallery ảnh |
| 5 | Lọc + tìm kiếm + danh sách bảng | Tìm BĐS theo giá/diện tích < 10 giây |
| 6 | Trạng thái + phân quyền admin/staff | Admin quản lý tài khoản, đổi trạng thái |
| 7 | Nhập dữ liệu thật, dùng thử nội bộ | Sẵn sàng bước sang Pilot |

Mỗi bước đều ra sản phẩm chạy được — không chờ xong hết mới dùng.

## 7. Rủi ro chính

- **Dữ liệu đầu vào bẩn** (giá ghi tay, thiếu tọa độ): form bắt buộc trường tối thiểu, giá nhập theo đơn vị rõ ràng.
- **Nhân viên ngại đổi công cụ**: giữ màn hình danh sách giống Excel làm cầu nối.
- **Tọa độ sai**: bước chấm bản đồ là bắt buộc, không cho nhập tay lat/lng.
