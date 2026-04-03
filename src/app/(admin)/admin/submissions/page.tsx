import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminSubmissionsPage() {
  const [submitted, approved, rejected] = await Promise.all([
    prisma.campaignPost.findMany({
      where: { status: "submitted" },
      include: {
        application: {
          include: {
            campaign: { select: { name: true } },
            creatorProfile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.campaignPost.count({ where: { status: "approved" } }),
    prisma.campaignPost.count({ where: { status: "rejected" } }),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Submissions"
        subtitle="Post URLs submitted by creators, pending your review"
      />
      <StatCards
        stats={[
          { label: "Pending review", value: submitted.length },
          { label: "Approved", value: approved },
          { label: "Rejected", value: rejected },
          { label: "Auto-approved", value: "—" },
        ]}
      />

      <div className="rounded-lg border" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b" style={{ borderBottomColor: "var(--border)" }}>
          {["Creator", "Campaign", "Platform", "Submitted", ""].map((h) => (
            <p key={h} className="text-[13px]" style={{ color: "var(--text-muted)" }}>{h}</p>
          ))}
        </div>

        {submitted.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
            }
            title="No pending submissions"
            description="When creators submit post URLs for campaigns, they'll appear here for review. Posts auto-approve after 48 hours."
          />
        ) : (
          <div>
            {submitted.map((post, i) => (
              <div
                key={post.id}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                <p className="text-[14px]" style={{ color: "var(--text-primary)" }}>
                  {post.application.creatorProfile?.displayName ?? "—"}
                </p>
                <p className="text-[14px] truncate" style={{ color: "var(--text-secondary)" }}>{post.application.campaign.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap capitalize" style={{ background: "var(--accent-bg)", color: "var(--accent-foreground)" }}>
                  {post.platform}
                </span>
                <p className="text-[13px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {new Date(post.submittedAt).toLocaleDateString()}
                </p>
                <Link
                  href={post.postUrl}
                  target="_blank"
                  className="text-xs hover:underline whitespace-nowrap"
                  style={{ color: "var(--accent)" }}
                >
                  View post →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
