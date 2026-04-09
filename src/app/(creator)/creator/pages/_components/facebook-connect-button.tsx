"use client";

import { useState } from "react";

export function FacebookConnectButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#1877F2" }}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
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
                style={{ background: "#1877F2" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Connect Facebook Page
              </h3>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              You&apos;re about to be redirected to Facebook to authorize your Page.
            </p>

            <div
              className="rounded-lg p-4 mb-5 space-y-2"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">1.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Log into the correct account</strong> — make sure you&apos;re signed into the Facebook account that manages the Page you want to connect.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">2.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Must have a Facebook Page</strong> — personal profiles cannot be connected. You need to be an admin of a Facebook Page.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">3.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Grant all permissions</strong> — we need access to your Page insights to track performance analytics.
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
                href="/api/auth/facebook"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
                style={{ background: "#1877F2" }}
              >
                Continue to Facebook
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
