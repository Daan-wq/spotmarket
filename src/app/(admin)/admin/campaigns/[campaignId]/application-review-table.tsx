"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";

interface SocialAccount {
  platform: string;
  platformUsername: string;
  followerCount: number;
  engagementRate: { toString(): string } | string | number;
  lastSyncedAt: Date | string | null;
}

interface Application {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | string;
  followerSnapshot: number | null;
  engagementSnapshot: string | number | { toString(): string } | null;
  reviewNotes: string | null;
  creatorProfile: {
    id: string;
    displayName: string;
    primaryGeo: string;
    walletAddress: string | null;
    socialAccounts: SocialAccount[];
  };
}

const statusStyle: Record<string, { backgroundColor: string; color: string }> = {
  pending:   { backgroundColor: "#fffbeb", color: "#b45309" },
  approved:  { backgroundColor: "#f0fdf4", color: "#15803d" },
  active:    { backgroundColor: "#eff6ff", color: "#1d4ed8" },
  rejected:  { backgroundColor: "#fef2f2", color: "#b91c1c" },
  completed: { backgroundColor: "#f1f5f9", color: "#475569" },
};

export function ApplicationReviewTable({
  applications,
  campaignId,
}: {
  applications: Application[];
  campaignId: string;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function updateStatus(applicationId: string, status: "approved" | "rejected") {
    setProcessing(applicationId);
    await fetch(`/api/campaigns/${campaignId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes: notes[applicationId] ?? "" }),
    });
    router.refresh();
    setProcessing(null);
  }

  if (applications.length === 0) {
    return (
      <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
        <p className="text-sm" style={{ color: "#94a3b8" }}>No applications yet.</p>
      </div>
    );
  }

  const pending = applications.filter((a) => a.status === "pending");
  const rest = applications.filter((a) => a.status !== "pending");

  return (
    <div style={{ background: "#ffffff" }}>
      {[...pending, ...rest].map((app, i) => {
        const igAccount = app.creatorProfile.socialAccounts.find((a) => a.platform === "instagram");
        const isPending = app.status === "pending";
        const isProcessing = processing === app.id;
        const colors = statusStyle[app.status] ?? { backgroundColor: "#f1f5f9", color: "#475569" };

        return (
          <div
            key={app.id}
            className="px-5 py-5"
            style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                {/* Name + status */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
                    {app.creatorProfile.displayName}
                  </p>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>
                    ({app.creatorProfile.primaryGeo})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={colors}>
                    {app.status}
                  </span>
                </div>

                {/* Social stats */}
                <div className="flex flex-wrap gap-4 mb-3">
                  {igAccount ? (
                    <>
                      <span className="text-xs" style={{ color: "#64748b" }}>@{igAccount.platformUsername} (Instagram)</span>
                      <span className="text-xs" style={{ color: "#64748b" }}>
                        Followers: <strong style={{ color: "#0f172a" }}>{igAccount.followerCount.toLocaleString()}</strong>
                      </span>
                      <span className="text-xs" style={{ color: "#64748b" }}>
                        Engagement: <strong style={{ color: "#0f172a" }}>{igAccount.engagementRate.toString()}%</strong>
                      </span>
                      {igAccount.lastSyncedAt && (
                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                          Synced {new Date(igAccount.lastSyncedAt).toLocaleString()}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs" style={{ color: "#d97706" }}>No Instagram connected</span>
                  )}
                </div>

                {/* Snapshot */}
                {app.followerSnapshot && (
                  <p className="text-xs mb-3" style={{ color: "#94a3b8" }}>
                    At application: {app.followerSnapshot.toLocaleString()} followers · {app.engagementSnapshot?.toString()}% engagement
                  </p>
                )}

                {/* Review notes */}
                {isPending && (
                  <textarea
                    value={notes[app.id] ?? ""}
                    onChange={(e) => setNotes({ ...notes, [app.id]: e.target.value })}
                    placeholder="Optional review note..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all resize-none"
                    style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                )}
                {!isPending && app.reviewNotes && (
                  <p className="text-xs italic" style={{ color: "#94a3b8" }}>Note: {app.reviewNotes}</p>
                )}
              </div>

              {/* Actions */}
              {isPending && (
                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => updateStatus(app.id, "approved")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: "#16a34a" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "#15803d"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#16a34a"; }}
                  >
                    {isProcessing ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => updateStatus(app.id, "rejected")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
                    onMouseEnter={(e) => { if (!isProcessing) (e.currentTarget as HTMLElement).style.background = "#fee2e2"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
