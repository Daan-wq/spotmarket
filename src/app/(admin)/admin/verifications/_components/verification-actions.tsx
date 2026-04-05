'use client';

import { useState } from 'react';

export default function VerificationActions({ id, isVerified }: { id: string; isVerified: boolean }) {
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verifications/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      if (res.ok) location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fail() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/verifications/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED' })
      });
      if (res.ok) location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (isVerified) return <span style={{ color: 'var(--text-secondary)' }}>Verified</span>;

  return (
    <div className="flex gap-2">
      <button onClick={verify} disabled={loading} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Verify
      </button>
      <button onClick={fail} disabled={loading} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--error-bg)', color: 'var(--error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Fail
      </button>
    </div>
  );
}
