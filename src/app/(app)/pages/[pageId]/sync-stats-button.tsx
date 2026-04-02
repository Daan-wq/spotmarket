"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncStatsButton({ creatorProfileId, pageId }: { creatorProfileId: string; pageId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function sync() {
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch(`/api/creators/${creatorProfileId}/sync`, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      setStatus("ok");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={sync}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50"
        style={{ borderColor: "#e2e8f0", color: "#475569", background: "#f8fafc" }}
        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.background = "#f1f5f9"; } }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        {loading ? "Syncing…" : "Sync Stats"}
      </button>
      {status === "ok" && <p className="text-xs" style={{ color: "#16a34a" }}>Updated</p>}
      {status === "error" && <p className="text-xs" style={{ color: "#dc2626" }}>Failed — try reconnecting Instagram</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
