import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApplicationReviewTable } from "./application-review-table";
import { CampaignStatusToggle } from "./campaign-status-toggle";

function toPlain<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return Number(v);
      if (v !== null && typeof v === "object" && typeof v.toFixed === "function") return Number(v);
      return v;
    })
  );
}

export default async function AdminCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      applications: {
        include: {
          creatorProfile: {
            include: {
              socialAccounts: {
                where: { isActive: true },
                select: {
                  platform: true,
                  platformUsername: true,
                  followerCount: true,
                  engagementRate: true,
                  audienceGeo: true,
                  lastSyncedAt: true,
                },
              },
            },
          },
          posts: {
            orderBy: { submittedAt: "desc" },
            select: {
              id: true, postUrl: true, status: true, submittedAt: true,
              verifiedViews: true, brandDeclineReason: true, adminDeclineReason: true,
              brandReviewedAt: true, sourceType: true,
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      },
      report: true,
    },
  });

  if (!campaign) notFound();

  const c = toPlain(campaign);

  const pending = c.applications.filter((a) => a.status === "pending");
  const approved = c.applications.filter((a) =>
    ["approved", "active", "completed"].includes(a.status)
  );
  const rejected = c.applications.filter((a) => a.status === "rejected");

  const details = [
    { label: "Target Geo",     value: c.targetGeo.join(", ") },
    { label: "Creator rate",   value: `$${(Number(c.creatorCpv) * 1_000_000).toFixed(2)}/1M views` },
    { label: "Total Budget",   value: `$${c.totalBudget}` },
    { label: "Deadline",       value: new Date(c.deadline).toLocaleDateString() },
    { label: "Min Engagement", value: `${c.minEngagementRate}%` },
    { label: "Your margin",    value: `$${(Number(c.adminMargin) * 1_000_000).toFixed(2)}/1M views` },
    { label: "Referral Link",  value: c.referralLink ? c.referralLink.substring(0, 30) + "…" : "—" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <Link href="/admin/campaigns" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
            ← Campaigns
          </Link>
          <h1 className="text-2xl font-semibold mt-2" style={{ color: "var(--text-primary)" }}>{c.name}</h1>
        </div>
        <CampaignStatusToggle campaignId={c.id} currentStatus={c.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        {details.map(({ label, value }) => (
          <div key={label} className="px-4 py-4" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div
          className="px-5 py-3 flex items-center gap-6"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Pending ({pending.length})
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Approved ({approved.length})
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Rejected ({rejected.length})

          </p>
        </div>
        <ApplicationReviewTable
          applications={c.applications.filter((app) => app.creatorProfile !== null) as Parameters<typeof ApplicationReviewTable>[0]["applications"]}
          campaignId={c.id}
        />
      </div>
    </div>
  );
}
