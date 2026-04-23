'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface WithdrawalActionsProps {
  id: string;
  status: string;
  walletAddress: string;
  txHash: string | null;
}

export default function WithdrawalActions({ id, status, walletAddress, txHash }: WithdrawalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [txInput, setTxInput] = useState('');
  const [showTxForm, setShowTxForm] = useState(false);
  const loading = isPending;

  async function updateStatus(newStatus: string, hash?: string) {
    if (isPending) return;
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, txHash: hash }),
      });
      if (!res.ok) {
        toast.error('Failed to update withdrawal');
        return;
      }
      toast.success(`Withdrawal ${newStatus.toLowerCase()}`);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error(err);
      toast.error('Network error');
    }
  }

  if (status === 'CONFIRMED' || status === 'REJECTED') {
    if (txHash) {
      return (
        <a
          href={`https://tronscan.org/#/transaction/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
          style={{ color: 'var(--primary)' }}
        >
          {txHash.slice(0, 12)}...
        </a>
      );
    }
    return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
  }

  if (status === 'SENT') {
    return (
      <button
        onClick={() => updateStatus('CONFIRMED')}
        disabled={loading}
        style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {loading ? '...' : 'Confirm'}
      </button>
    );
  }

  // PENDING or PROCESSING
  return (
    <div className="space-y-2">
      {showTxForm ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="TX hash"
            value={txInput}
            onChange={(e) => setTxInput(e.target.value)}
            style={{ fontSize: '11px', padding: '3px 6px', width: '160px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-1">
            <button
              onClick={() => updateStatus('SENT', txInput)}
              disabled={loading || !txInput}
              style={{ fontSize: '11px', padding: '3px 6px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: loading || !txInput ? 0.5 : 1 }}
            >
              Mark Sent
            </button>
            <button
              onClick={() => setShowTxForm(false)}
              style={{ fontSize: '11px', padding: '3px 6px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1">
          {status === 'PENDING' && (
            <button
              onClick={() => updateStatus('PROCESSING')}
              disabled={loading}
              style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--warning-bg)', color: 'var(--warning-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Process
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(walletAddress);
              setShowTxForm(true);
            }}
            disabled={loading}
            style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--success-bg)', color: 'var(--success-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Send
          </button>
          <button
            onClick={() => updateStatus('REJECTED')}
            disabled={loading}
            style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--error-bg)', color: 'var(--error-text)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
