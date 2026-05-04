"use client";

import { useState } from "react";

export function InstagramConnectButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#E1306C" }}>
          <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
        Instagram
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
                style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Connect Instagram
              </h3>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              You&apos;re about to be redirected to Instagram to authorize your account.
            </p>

            <div
              className="rounded-lg p-4 mb-5 space-y-2"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">1.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Log into the correct account</strong> — make sure you&apos;re signed into the Instagram account you want to connect before continuing.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">2.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Must be a Business or Creator account</strong> — personal accounts cannot be connected. Switch in Instagram Settings &gt; Account type.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">3.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Grant all permissions</strong> — we need access to your profile info and insights to track campaign performance.
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
                href="/api/auth/instagram"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
              >
                Continue to Instagram
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
