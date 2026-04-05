'use client';

import { useState } from 'react';

export default function SubmissionActions({ id, status }: { id: string; status: string }) {
  const [loading, setLoading] = useState(false);

  async function approve() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/submissions/' + id + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });
      if (res.ok) location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/submissions/' + id + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionNote: 'Rejected by admin' })
      });
      if (res.ok) location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (status !== 'PENDING') return <span style={{ color: 'var(--text-secondary)' }}>-</span>;

  return (
    <div className="flex gap-2">
      <button onClick={approve} disabled={loading} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Approve
      </button>
      <button onClick={reject} disabled={loading} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--error-bg)', color: 'var(--error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Reject
      </button>
    </div>
  );
}
