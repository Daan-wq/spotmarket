"use client";

import { useState } from "react";

export function TikTokConnectButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.19a8.16 8.16 0 0 0 4.77 1.52V7.27a4.85 4.85 0 0 1-1-.58z" />
        </svg>
        TikTok
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full shadow-2xl border"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "#010101" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.19a8.16 8.16 0 0 0 4.77 1.52V7.27a4.85 4.85 0 0 1-1-.58z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Connect TikTok
              </h3>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              You&apos;re about to be redirected to TikTok to authorize your account.
            </p>

            <div
              className="rounded-lg p-4 mb-5 space-y-2"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">1.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Sign into the correct TikTok account</strong> — make sure you&apos;re logged into the account you want to connect.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">2.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Grant all permissions</strong> — we need read-only access to your profile stats and video data to track campaign performance.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">3.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>One account per connection</strong> — you can connect multiple TikTok accounts separately.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <a
                href="/api/auth/tiktok"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
                style={{ background: "#010101" }}
              >
                Continue to TikTok
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
