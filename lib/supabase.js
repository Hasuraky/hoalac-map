import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Client phía trình duyệt, lưu session trong cookie để middleware đọc được.
// Nếu chưa cấu hình Supabase, app chạy chế độ demo với dữ liệu mẫu (lib/mock-data.js).
export const supabase = url && anonKey ? createBrowserClient(url, anonKey) : null;
