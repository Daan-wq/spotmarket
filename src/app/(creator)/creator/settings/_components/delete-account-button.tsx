"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteAccountButton() {
  const [showModal, setShowModal] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isConfirmed = confirm === "CONFIRM";

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/sign-in?deleted=true");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
      >
        Delete Account
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "var(--error-bg)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--error-text)" }}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Delete Account
                </h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  This action is permanent and cannot be undone
                </p>
              </div>
            </div>

            {/* Warning */}
            <div
              className="rounded-lg p-4 mb-5 text-sm"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
            >
              This will permanently delete all your data from the servers — including your profile, connected accounts, submissions, and earnings history.
            </div>

            {/* Confirm input */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                Type <span className="font-bold font-mono">CONFIRM</span> to delete your ClipProfit account and all data
              </label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="CONFIRM"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: isConfirmed ? "var(--error-text)" : "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {error && (
              <p className="text-sm mb-4" style={{ color: "var(--error-text)" }}>{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setConfirm(""); setError(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isConfirmed || loading}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--error-text)" }}
              >
                {loading ? "Deleting..." : "Delete my account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
