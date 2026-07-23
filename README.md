# Bản đồ BĐS Hòa Lạc

Nền tảng quản lý và tra cứu bất động sản khu Hòa Lạc trên bản đồ tương tác — thay thế Excel/Zalo. Mỗi BĐS là một marker trên bản đồ, có popup xem nhanh và trang chi tiết. Không phải website đăng tin: đây là công cụ quản lý bảng hàng theo không gian địa lý.

## Tính năng hiện có

**Bản đồ (Goong Maps — dữ liệu Việt Nam)**
- Nền Bản đồ / Vệ tinh, nút bật-tắt địa điểm (POI), nút định vị người dùng
- Marker màu theo trạng thái (còn hàng / đã cọc / đã bán / ngừng bán), popup ảnh + giá
- Chỉ đường từ vị trí hiện tại đến BĐS (OSRM, miễn phí)
- Zoom toàn Việt Nam, đánh dấu chủ quyền Hoàng Sa / Trường Sa

**Bộ lọc & tra cứu**
- Tìm theo mã / tên / địa chỉ, lọc trạng thái, tag loại hình, khoảng giá & diện tích

**Quản lý bảng hàng**
- Thêm / sửa / xóa BĐS: chấm vị trí trên bản đồ (click / dán tọa độ / GPS), mã tự sinh `HL-{diện tích}-{số thứ tự}`, cảnh báo trùng lặp bán kính 40m
- Upload nhiều ảnh (tự nén), chọn ảnh bìa, thư viện ảnh trang chi tiết

**Phân quyền 5 cấp** (khóa từ database)
- Khách (không đăng nhập): xem bản đồ + thông tin cơ bản, giá bị ẩn
- Người dùng: xem đầy đủ trừ ghi chú nội bộ
- Sale: đọc toàn bộ bảng hàng, xử lý data tư vấn được giao
- Admin: thêm/sửa/xóa BĐS, quản lý tài khoản cấp thấp hơn
- Owner: quyền tuyệt đối (duy nhất 1)

**Khu nội bộ** (`/quan-tri`)
- Thành viên: quản lý tài khoản (admin/owner) hoặc danh bạ đồng nghiệp (sale)
- Data tư vấn: khách ngoài gửi yêu cầu tư vấn → admin phân cho sale → sale xử lý; lead đã giao bị khóa khỏi tầm nhìn admin (chỉ owner + sale phụ trách thấy)

## Chạy thử

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Chưa cấu hình Supabase thì app chạy chế độ demo với dữ liệu mẫu.

## Cấu hình đầy đủ

1. **Supabase**: tạo project tại https://supabase.com → **SQL Editor** chạy lần lượt:
   `schema.sql` → `seed.sql` → `auth-policies.sql` → `roles-public.sql` → `storage-images.sql` → `account-management.sql` → `leads.sql`
2. **Goong**: đăng ký https://account.goong.io → tạo **Maptiles key**
3. Copy `.env.example` → `.env.local`, điền các khóa (xem chú thích trong file)
4. Phong owner cho tài khoản của bạn:
   ```sql
   update profiles set role = 'owner'
   where id = (select id from auth.users where email = 'EMAIL_CUA_BAN');
   ```

## Triển khai

Đẩy code lên GitHub → import vào Vercel → thêm các biến môi trường (gồm `SUPABASE_SERVICE_ROLE_KEY` không có tiền tố public) → Deploy. Mỗi lần push sau đó Vercel tự deploy lại.

## Cấu trúc

```
app/page.jsx                  Trang bản đồ chính
app/login/page.jsx            Đăng nhập
app/bds/[id]/page.jsx         Chi tiết BĐS
app/bds/moi, /[id]/sua        Thêm / sửa BĐS
app/quan-tri/page.jsx         Khu nội bộ (Thành viên + Data tư vấn)
app/api/leads                 API nhận yêu cầu tư vấn (công khai)
app/api/admin/*               API quản trị (service_role + kiểm cấp)
components/MapView.jsx         Bản đồ Goong + marker + popup + chỉ đường
components/PropertyForm.jsx    Form thêm/sửa + chống trùng
components/ImageManager.jsx    Upload & quản lý ảnh
components/LeadForm.jsx        Popup yêu cầu tư vấn (khách)
components/admin/*             Panel Thành viên & Data tư vấn
lib/properties.js, images.js  Truy cập dữ liệu
lib/supabase-admin.js         Client service_role (chỉ server)
supabase/*.sql                Schema + policy + storage + leads
```

## Lộ trình

- **Giai đoạn 2 (MVP)**: hoàn thành — bản đồ, quản lý bảng hàng, ảnh, phân quyền, tư vấn
- **Giai đoạn 3 (Pilot)**: nhập bảng hàng thật, đội sale dùng thử, thu phản hồi
- **Giai đoạn 4 (Multi-company)**: nhiều công ty, cấu trúc nhóm/team (schema đã sẵn `company_id`)
- **Giai đoạn 5 (Ecosystem)**: lịch sử giá, thống kê, phân tích thị trường
