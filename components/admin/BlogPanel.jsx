'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/images';
import { slugify, formatDate } from '@/lib/posts';

const EMPTY = {
  title: '',
  slug: '',
  excerpt: '',
  tags: '',
  cover_image: '',
  content: '',
  published: false,
  pub_date: '',
  views: '',
};

const BUCKET = 'property-images';

export default function BlogPanel() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function reload() {
    setLoading(true);
    if (!supabase) {
      setError('Chế độ demo — chưa kết nối Supabase.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setList(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    reload();
  }, []);

  function openNew() {
    setForm(EMPTY);
    setEditing({});
    setError(null);
  }
  function openEdit(p) {
    setForm({
      title: p.title ?? '',
      slug: p.slug ?? '',
      excerpt: p.excerpt ?? '',
      tags: (p.tags || []).join(', '),
      cover_image: p.cover_image ?? '',
      content: p.content ?? '',
      published: !!p.published,
      pub_date: p.published_at ? p.published_at.slice(0, 10) : '',
      views: p.views ?? 0,
    });
    setEditing(p);
    setError(null);
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadCover(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await compressImage(file, 1600, 0.82);
      const path = `blog/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      set('cover_image', url);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      setError('Cần nhập tiêu đề.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const slug = (form.slug.trim() || slugify(form.title)).trim();
      const values = {
        title: form.title.trim(),
        slug,
        excerpt: form.excerpt.trim() || null,
        tags: form.tags
          ? form.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        cover_image: form.cover_image || null,
        content: form.content || null,
        published: form.published,
        published_at: form.published
          ? form.pub_date
            ? new Date(form.pub_date + 'T12:00:00').toISOString()
            : editing?.published_at || new Date().toISOString()
          : null,
        views: Math.max(0, parseInt(form.views, 10) || 0),
      };
      if (editing?.id) {
        const { error } = await supabase.from('posts').update(values).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase.from('posts').insert({ ...values, created_by: u?.user?.id ?? null });
        if (error) {
          if (error.code === '23505') throw new Error(`Đường dẫn "${slug}" đã tồn tại — đổi tiêu đề hoặc slug.`);
          throw error;
        }
      }
      await reload();
      setEditing(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!confirm(`Xóa bài "${p.title}"?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', p.id);
      if (error) throw error;
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const styleTag = (
    <style>{`
      .bform{max-width:820px;}
      .bform label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.03em;margin-bottom:14px;}
      .bform input,.bform textarea{font:inherit;font-size:14px;font-weight:400;text-transform:none;letter-spacing:normal;color:var(--ink);padding:9px 11px;border:1px solid var(--stone-dark);border-radius:8px;background:#fff;width:100%;}
      .bform textarea.content{min-height:340px;font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.6;}
      .bform textarea.excerpt{min-height:64px;}
      .brow{display:flex;gap:14px;flex-wrap:wrap;}
      .brow>label{flex:1;min-width:220px;}
      .bcover{display:flex;align-items:center;gap:14px;margin-bottom:14px;}
      .bcover img{width:120px;height:74px;object-fit:cover;border-radius:8px;border:1px solid var(--stone-dark);}
      .bpub{flex-direction:row!important;align-items:center;gap:9px!important;text-transform:none!important;font-size:14px!important;color:var(--ink)!important;}
      .bpub input{width:auto!important;}
      .bactions{display:flex;gap:10px;margin-top:20px;}
      .berr{color:#b3402f;font-size:13px;margin-top:10px;}
      .brow-item{display:flex;align-items:center;gap:14px;border:1px solid var(--stone-dark);border-radius:10px;padding:10px 14px;background:#fff;margin-bottom:10px;}
      .brow-item img,.brow-item .noimg{width:64px;height:44px;border-radius:6px;object-fit:cover;flex:0 0 auto;background:var(--stone-light);display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--ink-soft);}
      .brow-item .bi-main{flex:1;min-width:0;}
      .brow-item .bi-title{font-weight:700;color:var(--ink);}
      .brow-item .bi-sub{font-size:12px;color:var(--ink-soft);}
      .bi-badge{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;color:#fff;}
    `}</style>
  );

  if (loading) return <p className="form-hint">Đang tải…</p>;

  if (editing) {
    return (
      <div className="bform">
        {styleTag}
        <label>
          Tiêu đề *
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="VD: Có nên mua biệt thự Xanh Villas Hòa Lạc?"
          />
        </label>
        <div className="brow">
          <label>
            Đường dẫn (slug)
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder={slugify(form.title) || 'tu-dong-tao-tu-tieu-de'}
            />
          </label>
          <label>
            Thẻ (phân cách bằng dấu phẩy)
            <input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Xanh Villas, Hòa Lạc" />
          </label>
        </div>
        <label>
          Mô tả ngắn (hiện ở danh sách &amp; Google)
          <textarea className="excerpt" value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
        </label>

        <div className="bcover">
          {form.cover_image ? <img src={form.cover_image} alt="" /> : <div className="brow-item noimg">Chưa ảnh</div>}
          <div>
            <input type="file" accept="image/*" onChange={(e) => uploadCover(e.target.files?.[0])} />
            {uploading && <p className="form-hint">Đang tải ảnh…</p>}
          </div>
        </div>

        <label>
          Nội dung (Markdown)
          <textarea
            className="content"
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder={'## Tiêu đề mục\n\nĐoạn văn...\n\n- Ý 1\n- Ý 2\n\n**In đậm**, [liên kết](https://...)'}
          />
        </label>

        <label className="bpub">
          <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
          Đăng công khai (bỏ tick = lưu nháp)
        </label>

        <div className="brow">
          <label>
            Ngày đăng (tùy chỉnh)
            <input type="date" value={form.pub_date} onChange={(e) => set('pub_date', e.target.value)} />
          </label>
          <label>
            Lượt xem (tùy chỉnh)
            <input
              type="number"
              min="0"
              value={form.views}
              onChange={(e) => set('views', e.target.value)}
              placeholder="0"
            />
          </label>
        </div>
        <p className="form-hint" style={{ marginTop: -6 }}>
          Để trống ngày đăng = dùng ngày hiện tại. Lượt xem sẽ tiếp tục tự tăng khi có người đọc.
        </p>

        {error && <p className="berr">{error}</p>}
        <div className="bactions">
          <button className="btn-primary" onClick={save} disabled={busy || uploading}>
            {busy ? 'Đang lưu…' : editing?.id ? 'Lưu bài' : 'Tạo bài'}
          </button>
          <button
            className="btn-logout"
            onClick={() => setEditing(null)}
            disabled={busy}
            style={{ color: 'var(--ink)', borderColor: 'var(--stone-dark)' }}
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {styleTag}
      <div className="rpanel-toolbar">
        <p className="form-hint" style={{ margin: 0 }}>
          {list.length} bài viết
        </p>
        <button
          className="btn-add"
          onClick={openNew}
          style={{ color: '#fff', background: 'var(--moss)', borderColor: 'var(--moss)' }}
        >
          + Viết bài mới
        </button>
      </div>
      {error && <p className="berr">{error}</p>}
      {list.length === 0 ? (
        <p className="form-hint">Chưa có bài viết. Bấm "Viết bài mới" để bắt đầu.</p>
      ) : (
        list.map((p) => (
          <div className="brow-item" key={p.id}>
            {p.cover_image ? <img src={p.cover_image} alt="" /> : <div className="noimg">Không ảnh</div>}
            <div className="bi-main">
              <div className="bi-title">{p.title}</div>
              <div className="bi-sub">
                /blog/{p.slug}
                {p.published_at ? ` · ${formatDate(p.published_at)}` : ''}
                {` · 👁 ${(p.views ?? 0).toLocaleString('vi-VN')} lượt xem`}
              </div>
            </div>
            <span
              className="bi-badge"
              style={{ background: p.published ? 'var(--st-available)' : 'var(--st-inactive)' }}
            >
              {p.published ? 'Đã đăng' : 'Nháp'}
            </span>
            <div className="rp-actions">
              <button
                className="btn-logout"
                onClick={() => openEdit(p)}
                style={{ color: 'var(--ink)', borderColor: 'var(--stone-dark)' }}
              >
                Sửa
              </button>
              <button
                className="btn-logout"
                onClick={() => remove(p)}
                disabled={busy}
                style={{ color: '#b3402f', borderColor: '#e0b3ab' }}
              >
                Xóa
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
