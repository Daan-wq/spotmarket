'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function VerificationActions({ id, isVerified }: { id: string; isVerified: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function update(status: 'VERIFIED' | 'FAILED') {
    if (isPending) return;
    try {
      const res = await fetch('/api/admin/verifications/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        toast.error(`Failed to ${status === 'VERIFIED' ? 'verify' : 'reject'} submission`);
        return;
      }
      toast.success(status === 'VERIFIED' ? 'Verification confirmed' : 'Verification rejected');
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  }

  if (isVerified) return <span style={{ color: 'var(--text-secondary)' }}>Verified</span>;

  return (
    <div className="flex gap-2">
      <button onClick={() => update('VERIFIED')} disabled={isPending} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {isPending ? '…' : 'Verify'}
      </button>
      <button onClick={() => update('FAILED')} disabled={isPending} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--error-bg)', color: 'var(--error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        {isPending ? '…' : 'Fail'}
      </button>
    </div>
  );
}
