"use client";

import { useState } from "react";

export function YoutubeConnectButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all hover:shadow-sm"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#FF0000" }}>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon fill="#fff" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
        </svg>
        YouTube
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
                style={{ background: "#FF0000" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                  <polygon fill="#FF0000" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
                </svg>
              </div>
              <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Connect YouTube
              </h3>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              You&apos;re about to be redirected to Google to authorize your YouTube channel.
            </p>

            <div
              className="rounded-lg p-4 mb-5 space-y-2"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">1.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Sign into the correct Google account</strong> — make sure you&apos;re logged into the Google account that owns your YouTube channel.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">2.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>Grant all permissions</strong> — we need read-only access to your channel data and analytics to track campaign performance.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">3.</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <strong>YouTube Shorts only</strong> — we track Shorts performance (videos under 60 seconds) for campaign metrics.
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
                href="/api/auth/youtube"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white text-center transition-all hover:opacity-90"
                style={{ background: "#FF0000" }}
              >
                Continue to Google
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
