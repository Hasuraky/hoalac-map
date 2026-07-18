'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchImages, uploadImages, deleteImage, setCover } from '@/lib/images';

// Quản lý ảnh của 1 BĐS (trong form sửa): upload nhiều, đặt bìa, xóa
export default function ImageManager({ propertyId }) {
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const reload = () =>
    fetchImages(propertyId)
      .then(setImages)
      .catch((e) => setError(e.message));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  async function handleFiles(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError(null);
    setBusy(true);
    try {
      await uploadImages(propertyId, files, (i, n) => setProgress(`Đang tải ảnh ${i}/${n}…`));
      await reload();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
    setProgress('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(img) {
    if (!window.confirm('Xóa ảnh này?')) return;
    setBusy(true);
    try {
      await deleteImage(img);
      // nếu xóa ảnh bìa -> đặt ảnh đầu còn lại làm bìa
      const rest = images.filter((i) => i.id !== img.id);
      if (img.is_cover && rest.length > 0) await setCover(propertyId, rest[0].id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function handleSetCover(img) {
    setBusy(true);
    try {
      await setCover(propertyId, img.id);
      await reload();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <section>
      <h2 className="section-title">Hình ảnh ({images.length})</h2>

      <div className="image-grid">
        {images.map((img) => (
          <div className={`image-cell${img.is_cover ? ' cover' : ''}`} key={img.id}>
            <img src={img.url} alt="" />
            {img.is_cover && <span className="cover-tag">Ảnh bìa</span>}
            <div className="image-actions">
              {!img.is_cover && (
                <button type="button" onClick={() => handleSetCover(img)} disabled={busy}>
                  Đặt bìa
                </button>
              )}
              <button type="button" className="danger" onClick={() => handleDelete(img)} disabled={busy}>
                Xóa
              </button>
            </div>
          </div>
        ))}

        <label className={`image-add${busy ? ' disabled' : ''}`}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            disabled={busy}
          />
          {busy ? progress || 'Đang xử lý…' : '+ Thêm ảnh'}
        </label>
      </div>

      <p className="form-hint">Ảnh tự nén trước khi tải lên. Ảnh bìa hiện trong popup bản đồ.</p>
      {error && <div className="login-error">{error}</div>}
    </section>
  );
}
