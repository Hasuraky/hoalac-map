'use server';

import { revalidatePath } from 'next/cache';

// Xóa cache ISR cho blog sau khi admin thêm/sửa bài -> hiển thị số liệu mới ngay.
export async function revalidateBlog(slug) {
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
}
