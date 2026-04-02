"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRON_TX_REGEX = /^[0-9a-fA-F]{64}$/;

interface Props {
  campaignId: string;
  requiredUsdt: number;
  adminWalletAddress: string | null;
  alreadySubmitted: boolean;
  existingTxHash?: string;
}

export function PaymentForm({ campaignId, requiredUsdt, adminWalletAddress, alreadySubmitted, existingTxHash }: Props) {
  const router = useRouter();
  const [txHash, setTxHash] = useState(existingTxHash ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const txHashValid = TRON_TX_REGEX.test(txHash);

  async function copyAddress() {
    if (!adminWalletAddress) return;
    await navigator.clipboard.writeText(adminWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!txHashValid) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to submit transaction hash");
        return;
      }

      router.push("/dashboard?launched=1");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (alreadySubmitted) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <p className="font-semibold mb-1">Payment submitted — under review</p>
          <p>Your transaction hash has been received. Our team will verify the deposit and activate your campaign shortly.</p>
          {existingTxHash && (
            <p className="mt-2 font-mono text-xs break-all text-green-700">
              TX: <a href={`https://tronscan.org/#/transaction/${existingTxHash}`} target="_blank" rel="noopener noreferrer" className="underline">{existingTxHash}</a>
            </p>
          )}
        </div>
        <a href="/dashboard" className="block w-full text-center py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-semibold">✓</span>
        <span className="text-gray-400">Campaign details</span>
        <span className="text-gray-300 mx-1">→</span>
        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-semibold">2</span>
        <span className="font-medium text-gray-700">Send payment</span>
        <span className="text-gray-300 mx-1">→</span>
        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center">3</span>
        <span className="text-gray-400">Admin review</span>
      </div>

      {/* Amount */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-1">Amount to send</p>
        <p className="text-3xl font-bold text-indigo-700">{requiredUsdt} USDT</p>
        <p className="text-xs text-indigo-500 mt-1">TRC-20 network (Tron)</p>
      </div>

      {/* Wallet address */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-medium text-gray-700">Send to this wallet:</p>
        {adminWalletAddress ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all text-gray-800">
              {adminWalletAddress}
            </code>
            <button
              type="button"
              onClick={copyAddress}
              className="shrink-0 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-red-500">Wallet address not configured — contact support.</p>
        )}
        <p className="text-xs text-gray-500">
          Network: <strong>TRC-20 (Tron)</strong> — do NOT send on ERC-20 or any other network.
        </p>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-medium text-gray-800">Steps:</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-600">
          <li>Send exactly <strong>{requiredUsdt} USDT</strong> (TRC-20) to the address above.</li>
          <li>Wait for the transaction to confirm on Tron (usually under 1 minute).</li>
          <li>Copy your transaction hash from your wallet or Tronscan and paste it below.</li>
          <li>Submit — our team will verify and activate your campaign.</li>
        </ol>
      </div>

      {/* Tx hash form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction hash *
          </label>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value.trim())}
            placeholder="64-character hex (e.g. a1b2c3d4…)"
            className={`w-full px-3 py-2.5 font-mono text-sm rounded-lg border focus:outline-none focus:ring-2 ${
              txHash && !txHashValid
                ? "border-red-400 focus:ring-red-400"
                : "border-gray-300 focus:ring-indigo-500"
            }`}
          />
          {txHash && !txHashValid && (
            <p className="text-xs text-red-500 mt-1">Must be a 64-character hex string</p>
          )}
          {txHash && txHashValid && (
            <p className="text-xs text-gray-500 mt-1">
              <a href={`https://tronscan.org/#/transaction/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                Verify on Tronscan ↗
              </a>
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={!txHashValid || loading || !adminWalletAddress}
          className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit transaction hash"}
        </button>
      </form>
    </div>
  );
}
