'use client';

import { useEffect, useState } from 'react';

const STATUS_LABELS = {
  new: 'Mới',
  assigned: 'Đang xử lý',
  returned: 'Trả lại kho',
  spam: 'Data rác',
  converted: 'Đã thành khách',
};

// Panel data tư vấn (sale/admin/owner)
export default function LeadsPanel({ myRole }) {
  const [leads, setLeads] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const canAssign = myRole === 'admin' || myRole === 'owner';

  async function load() {
    setError(null);
    const res = await fetch('/api/admin/leads');
    const json = await res.json();
    if (!res.ok) { setError(json.error); setLeads([]); }
    else setLeads(json.leads);
    setLoading(false);
  }

  async function loadSales() {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const json = await res.json();
      setSales(json.users.filter((u) => ['sale', 'admin', 'owner'].includes(u.role)));
    }
  }

  useEffect(() => {
    load();
    if (myRole === 'admin' || myRole === 'owner') loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function patch(id, payload) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) setError(json.error);
    load();
  }

  if (loading) return <p className="form-hint">Đang tải…</p>;

  return (
    <>
      {error && <div className="login-error">{error}</div>}

      {leads.length === 0 ? (
        <div className="detail-card admin-card">
          <p className="form-hint">Chưa có yêu cầu tư vấn nào.</p>
        </div>
      ) : (
        <div className="lead-list">
          {leads.map((l) => (
            <div className="detail-card lead-item" key={l.id}>
              <div className="lead-head">
                <div>
                  <strong className="lead-name">{l.full_name}</strong>
                  <a href={`tel:${l.phone}`} className="lead-phone">📞 {l.phone}</a>
                </div>
                <span className={`role-badge lead-status-${l.status}`}>{STATUS_LABELS[l.status]}</span>
              </div>

              <p className="lead-content">{l.content}</p>

              <div className="lead-fields">
                {l.budget && <span>💰 {l.budget}</span>}
                {l.address && <span>📍 {l.address}</span>}
                {l.property_code && <span>🏠 {l.property_code}</span>}
                {l.assigned_name && <span>👤 Phụ trách: {l.assigned_name}</span>}
              </div>

              {l.sale_note && <p className="lead-note">Ghi chú: {l.sale_note}</p>}

              {canAssign && ['new', 'returned'].includes(l.status) && (
                <div className="lead-actions">
                  <select defaultValue="" disabled={busy}
                    onChange={(e) => e.target.value && patch(l.id, { assigned_to: e.target.value })}>
                    <option value="">— Giao cho sale —</option>
                    {sales.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email} ({s.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {(myRole === 'owner' || (myRole === 'sale' && l.status === 'assigned')) && (
                <div className="lead-actions">
                  <button className="btn-mini" disabled={busy} onClick={() => patch(l.id, { status: 'converted' })}>✓ Đã thành khách</button>
                  <button className="btn-mini" disabled={busy} onClick={() => patch(l.id, { status: 'returned' })}>↩ Trả lại kho</button>
                  <button className="btn-mini danger" disabled={busy} onClick={() => patch(l.id, { status: 'spam' })}>🗑 Data rác</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
