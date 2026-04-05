"use client";

import { useState } from "react";
import Link from "next/link";
import { ApplicationActions } from "./application-actions";
import { SubmissionActions } from "./submission-actions";

interface CampaignDetailClientProps {
  campaign: {
    id: string;
    name: string;
    description?: string | null;
    totalBudget: number | string;
    _count?: { applications: number };
  };
  applications: Array<{
    id: string;
    status: string;
    appliedAt: Date;
    creatorProfile?: {
      displayName: string;
      totalFollowers: number;
      igConnection?: { igUsername: string };
    };
  }>;
  submissions: Array<{
    id: string;
    status: string;
    claimedViews: number;
    createdAt: Date;
    postUrl?: string;
    screenshotUrl?: string;
    application?: {
      creatorProfile?: { displayName: string };
    };
  }>;
  spentAmount: number | string | bigint;
  totalViews: number | string | bigint;
}

export function CampaignDetailClient({
  campaign,
  applications,
  submissions,
  spentAmount,
  totalViews,
}: CampaignDetailClientProps) {
  const [tab, setTab] = useState<"applications" | "submissions">("applications");

  return (
    <div className="p-8">
      <Link
        href="/advertiser/campaigns"
        className="text-sm mb-6 inline-block transition-opacity hover:opacity-70"
        style={{ color: "var(--accent)" }}
      >
        ← Back to Campaigns
      </Link>

      <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {campaign.name}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
        {campaign.description}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        {[
          { label: "Total Budget", value: `$${Number(campaign.totalBudget).toLocaleString()}` },
          { label: "Spent", value: `$${Number(spentAmount).toLocaleString()}` },
          { label: "Creators", value: campaign._count?.applications || 0 },
          { label: "Views", value: Number(totalViews).toLocaleString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-xl"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              {stat.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
          {["applications", "submissions"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as "applications" | "submissions")}
              className="px-4 py-3 font-medium text-sm capitalize transition-colors"
              style={{
                color: tab === t ? "var(--accent)" : "var(--text-secondary)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Tab */}
      {tab === "applications" && (
        <div>
          {applications.length === 0 ? (
            <div
              className="p-8 text-center rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--text-muted)" }}>No applications yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Creator Name
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      IG Username
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Followers
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Applied
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                        {app.creatorProfile?.displayName || "Unknown"}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                        @{app.creatorProfile?.igConnection?.igUsername || "—"}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                        {app.creatorProfile?.totalFollowers?.toLocaleString() || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium capitalize inline-block"
                          style={{
                            background: app.status === "approved" ? "var(--accent-bg)" : "var(--bg-primary)",
                            color: app.status === "approved" ? "var(--accent)" : "var(--text-secondary)",
                          }}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {app.status === "pending" ? (
                          <ApplicationActions applicationId={app.id} />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {tab === "submissions" && (
        <div>
          {submissions.length === 0 ? (
            <div
              className="p-8 text-center rounded-xl"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--text-muted)" }}>No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Creator
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Post URL
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Screenshot
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Claimed Views
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Date
                    </th>
                    <th className="px-6 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                        {sub.application?.creatorProfile?.displayName || "Unknown"}
                      </td>
                      <td className="px-6 py-4">
                        {sub.postUrl ? (
                          <a
                            href={sub.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm transition-opacity hover:opacity-70"
                            style={{ color: "var(--accent)" }}
                          >
                            View →
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sub.screenshotUrl ? (
                          <a
                            href={sub.screenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm transition-opacity hover:opacity-70"
                            style={{ color: "var(--accent)" }}
                          >
                            View →
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                        {sub.claimedViews.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded-full text-xs font-medium capitalize inline-block"
                          style={{
                            background:
                              sub.status === "APPROVED"
                                ? "var(--accent-bg)"
                                : sub.status === "REJECTED"
                                  ? "var(--error-bg)"
                                  : "var(--bg-primary)",
                            color:
                              sub.status === "APPROVED"
                                ? "var(--accent)"
                                : sub.status === "REJECTED"
                                  ? "var(--error)"
                                  : "var(--text-secondary)",
                          }}
                        >
                          {sub.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === "PENDING" ? (
                          <SubmissionActions submissionId={sub.id} />
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
