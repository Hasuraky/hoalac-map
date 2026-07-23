'use client';

import { useState } from 'react';

const BUDGETS = [
  'Dưới 1 tỷ',
  '1 – 2 tỷ',
  '2 – 3 tỷ',
  '3 – 5 tỷ',
  '5 – 10 tỷ',
  'Trên 10 tỷ',
];

// Nút nổi + popup: khách ngoài gửi yêu cầu tư vấn
export default function LeadForm({ propertyCode = '' }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    content: '',
    budget: '',
    budgetCustom: '',
    address: '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const budget = form.budget === '__custom__' ? form.budgetCustom.trim() : form.budget;
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name,
        phone: form.phone,
        content: form.content,
        budget,
        address: form.address,
        property_code: propertyCode || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error);
      return;
    }
    setSent(true);
  }

  function close() {
    setOpen(false);
    // reset sau khi đóng
    setTimeout(() => {
      setSent(false);
      setError(null);
      setForm({ full_name: '', phone: '', content: '', budget: '', budgetCustom: '', address: '' });
    }, 300);
  }

  return (
    <>
      <button type="button" className="btn-consult" onClick={() => setOpen(true)}>
        💬 Yêu cầu tư vấn
      </button>

      {open && (
        <div className="lead-overlay" onClick={close}>
          <div className="lead-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="lead-close" onClick={close} aria-label="Đóng">
              ✕
            </button>

            {sent ? (
              <div className="lead-thanks">
                <div className="lead-thanks-icon">✓</div>
                <h2>Đã gửi yêu cầu!</h2>
                <p>Nhân viên tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.</p>
                <button type="button" className="btn-primary" onClick={close}>
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <h2 className="lead-title">Yêu cầu tư vấn</h2>
                <p className="lead-sub">Để lại thông tin, nhân viên sẽ liên hệ tư vấn miễn phí.</p>
                <form onSubmit={submit} className="lead-form">
                  <label>
                    Họ tên *
                    <input value={form.full_name} onChange={set('full_name')} required placeholder="Nguyễn Văn A" />
                  </label>
                  <label>
                    Số điện thoại *
                    <input value={form.phone} onChange={set('phone')} required placeholder="09xx xxx xxx" inputMode="tel" />
                  </label>
                  <label>
                    Nội dung cần tư vấn *
                    <textarea
                      rows={3}
                      value={form.content}
                      onChange={set('content')}
                      required
                      placeholder="Tôi quan tâm đất nền khu Hòa Lạc, cần tư vấn thêm..."
                    />
                  </label>
                  <label>
                    Ngân sách (không bắt buộc)
                    <select value={form.budget} onChange={set('budget')}>
                      <option value="">— Chọn —</option>
                      {BUDGETS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="__custom__">Tự nhập…</option>
                    </select>
                  </label>
                  {form.budget === '__custom__' && (
                    <label>
                      Ngân sách cụ thể
                      <input value={form.budgetCustom} onChange={set('budgetCustom')} placeholder="Ví dụ: khoảng 2,5 tỷ" />
                    </label>
                  )}
                  <label>
                    Khu vực quan tâm (không bắt buộc)
                    <input value={form.address} onChange={set('address')} placeholder="Thạch Hòa, Tân Xã..." />
                  </label>

                  {propertyCode && (
                    <p className="lead-ref">Về BĐS: <strong>{propertyCode}</strong></p>
                  )}
                  {error && <div className="login-error">{error}</div>}

                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
