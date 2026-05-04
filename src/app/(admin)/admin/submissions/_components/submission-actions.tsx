'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SubmissionActionsProps {
  id: string;
  status: string;
  postUrl: string | null;
}

export default function SubmissionActions({ id, status, postUrl }: SubmissionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [baselineViews, setBaselineViews] = useState('');
  const [viewCount, setViewCount] = useState('');

  async function approve() {
    if (isPending) return;
    const baseline = parseInt(baselineViews, 10);
    const views = parseInt(viewCount, 10);
    if (isNaN(baseline) || isNaN(views) || baseline < 0 || views < 0) return;

    try {
      const res = await fetch('/api/submissions/' + id + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED', baselineViews: baseline, viewCount: views })
      });
      if (!res.ok) {
        toast.error('Failed to approve submission');
        return;
      }
      toast.success('Submission approved');
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  }

  async function reject() {
    if (isPending) return;
    try {
      const res = await fetch('/api/submissions/' + id + '/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionNote: 'Rejected by admin' })
      });
      if (!res.ok) {
        toast.error('Failed to reject submission');
        return;
      }
      toast.success('Submission rejected');
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  }

  if (status !== 'PENDING') return <span style={{ color: 'var(--text-secondary)' }}>-</span>;

  return (
    <div className="space-y-2">
      {postUrl && (
        <a
          href={postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline block"
          style={{ color: 'var(--primary)' }}
        >
          View Post
        </a>
      )}

      {showApproveForm ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Baseline views"
              value={baselineViews}
              onChange={(e) => setBaselineViews(e.target.value)}
              min="0"
              style={{ fontSize: '11px', padding: '3px 6px', width: '100px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              placeholder="Current views"
              value={viewCount}
              onChange={(e) => setViewCount(e.target.value)}
              min="0"
              style={{ fontSize: '11px', padding: '3px 6px', width: '100px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
            />
          </div>
          {baselineViews && viewCount && (
            <p style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Eligible: {Math.max(0, parseInt(viewCount, 10) - parseInt(baselineViews, 10)).toLocaleString()} views
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={approve} disabled={isPending || !baselineViews || !viewCount} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: isPending || !baselineViews || !viewCount ? 0.5 : 1 }}>
              {isPending ? '...' : 'Confirm'}
            </button>
            <button onClick={() => setShowApproveForm(false)} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setShowApproveForm(true)} disabled={isPending} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Approve
          </button>
          <button onClick={reject} disabled={isPending} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--error-bg)', color: 'var(--error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {isPending ? '...' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  );
}
