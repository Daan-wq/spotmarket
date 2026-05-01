"use client";

import { useState } from "react";

interface Props {
  campaignName: string;
  requirements: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function SubmitHeader({ campaignName, requirements, isLoading, onRefresh }: Props) {
  const [showReqs, setShowReqs] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Submit Content for {campaignName}
          </h1>
          {requirements && (
            <button
              onClick={() => setShowReqs(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
              style={{
                background: "rgba(99,102,241,0.12)",
                color: "var(--primary)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              Requirements
            </button>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-default"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          title="Refresh posts"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isLoading ? "animate-spin" : ""}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Requirements modal */}
      {showReqs && requirements && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowReqs(false)}
        >
          <div
            className="rounded-xl border w-full max-w-lg p-6 shadow-xl"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Campaign Requirements
              </h2>
              <button
                onClick={() => setShowReqs(false)}
                className="p-1 rounded-lg cursor-pointer transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {requirements}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
