"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  targetGeo: string[];
  creatorCpv: number;
  deadline: string;
  contentGuidelines: string | null;
  niche: string | null;
  status: string;
}

export function JoinCampaignClient({ campaign, token }: { campaign: Campaign; token: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/join/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join");
      setSuccess(true);
      setTimeout(() => router.push("/campaigns"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setJoining(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-md w-full text-center rounded-xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--success-bg)" }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: "var(--success-text)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>You're in!</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecting to your campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-lg w-full rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
        <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--accent)" }}>Campaign Invite</p>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{campaign.name}</h1>
        </div>

        <div className="px-6 py-5 space-y-4">
          {campaign.description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{campaign.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Platform</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{campaign.platform}</p>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Rate</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>${(campaign.creatorCpv * 1_000_000).toFixed(0)}/1M views</p>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Region</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{campaign.targetGeo.join(", ") || "Global"}</p>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bg-secondary)" }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Deadline</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{new Date(campaign.deadline).toLocaleDateString()}</p>
            </div>
          </div>

          {campaign.contentGuidelines && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Guidelines</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{campaign.contentGuidelines}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          {error && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ color: "var(--error-text)", background: "var(--error-bg)" }}>{error}</p>
          )}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {joining ? "Joining..." : "Join Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}
