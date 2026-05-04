"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const loading = syncing || isPending;

  async function handleRefresh() {
    if (loading) return;
    setSyncing(true);
    setError(null);
    setTokenExpired(false);
    try {
      const res = await fetch("/api/instagram/sync-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errCode = (data as { error?: string }).error;
        if (errCode === "token_expired") {
          setTokenExpired(true);
          return;
        }
        throw new Error(errCode ?? "Sync failed");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ background: "var(--bg-secondary)", color: "var(--accent)" }}
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Syncing…
          </span>
        ) : (
          "Refresh now"
        )}
      </button>
      {tokenExpired && (
        <span className="text-xs text-amber-600">
          Token expired —{" "}
          <a href="/api/auth/instagram" className="underline font-medium">
            Reconnect Instagram
          </a>
        </span>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
