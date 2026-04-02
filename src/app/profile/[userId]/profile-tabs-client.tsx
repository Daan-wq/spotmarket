"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "launched" | "history" | "reviews";

interface LaunchedCampaign {
  id: string;
  name: string;
  description: string | null;
  status: string;
  totalBudget: unknown;
  creatorCpv: unknown;
  targetGeo: string[];
  deadline: Date;
  createdAt: Date;
  _count: { applications: number };
}

interface CreatorHistory {
  id: string;
  status: string;
  campaign: { id: string; name: string };
  posts: Array<{ snapshots: Array<{ viewsCount: number }> }>;
}

interface Review {
  id: string;
  rating: number;
  text: string | null;
  createdAt: Date;
  reviewer: { id: string; creatorProfile: { displayName: string; avatarUrl: string | null } | null };
  campaign: { id: string; name: string };
}

interface Props {
  launchedCampaigns: LaunchedCampaign[];
  creatorHistory: CreatorHistory[];
  reviews: Review[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active:          { bg: "#f0fdf4", text: "#15803d" },
  pending_review:  { bg: "#fffbeb", text: "#92400e" },
  pending_payment: { bg: "#fffbeb", text: "#92400e" },
  completed:       { bg: "#f3f4f6", text: "#6b7280" },
  paused:          { bg: "#fff7ed", text: "#c2410c" },
  draft:           { bg: "#f3f4f6", text: "#6b7280" },
};

export function ProfileTabsClient({ launchedCampaigns, creatorHistory, reviews }: Props) {
  const [tab, setTab] = useState<Tab>("launched");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "launched", label: "Launched Campaigns", count: launchedCampaigns.length },
    { key: "history", label: "Creator History", count: creatorHistory.length },
    { key: "reviews", label: "Reviews", count: reviews.length },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: tab === t.key ? "var(--text-primary)" : "transparent",
              color: tab === t.key ? "#fff" : "var(--text-secondary)",
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Launched Campaigns */}
      {tab === "launched" && (
        launchedCampaigns.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No campaigns launched yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {launchedCampaigns.map(c => {
              const sc = statusColors[c.status] ?? statusColors.draft;
              const budget = Number(c.totalBudget);
              const daysLeft = Math.max(0, Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000));
              return (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="rounded-xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0 capitalize font-medium" style={{ background: sc.bg, color: sc.text }}>
                      {c.status.replace("_", " ")}
                    </span>
                  </div>
                  {c.description && (
                    <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)" }}>{c.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs mt-auto" style={{ color: "var(--text-muted)" }}>
                    <span>${budget.toLocaleString()} budget</span>
                    <span>{c._count.applications} applicants</span>
                    {c.status === "active" && <span>{daysLeft}d left</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Creator History */}
      {tab === "history" && (
        creatorHistory.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No creator campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {creatorHistory.map(app => {
              const views = app.posts.reduce((s, p) => s + (p.snapshots[0]?.viewsCount ?? 0), 0);
              const sc = statusColors[app.status] ?? statusColors.draft;
              return (
                <Link
                  key={app.id}
                  href={`/campaigns/${app.campaign.id}`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:opacity-90 transition-opacity"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{app.campaign.name}</p>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    <span style={{ color: "var(--text-muted)" }}>{views.toLocaleString()} views</span>
                    <span className="px-2 py-0.5 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>
                      {app.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Reviews */}
      {tab === "reviews" && (
        reviews.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => {
              const name = r.reviewer.creatorProfile?.displayName ?? "Anonymous";
              return (
                <div key={r.id} className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link href={`/profile/${r.reviewer.id}`} className="text-sm font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                      {name}
                    </Link>
                    <span className="text-sm" style={{ color: "#f59e0b" }}>
                      {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                    </span>
                  </div>
                  {r.text && (
                    <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>{r.text}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <Link href={`/campaigns/${r.campaign.id}`} className="hover:underline">{r.campaign.name}</Link>
                    <span>·</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
