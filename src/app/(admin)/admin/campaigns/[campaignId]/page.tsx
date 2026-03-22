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
          <Link href="/admin/campaigns" className="text-sm hover:underline" style={{ color: "#94a3b8" }}>
            ← Campaigns
          </Link>
          <h1 className="text-2xl font-semibold mt-2" style={{ color: "#0f172a" }}>{c.name}</h1>
        </div>
        <CampaignStatusToggle campaignId={c.id} currentStatus={c.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        {details.map(({ label, value }) => (
          <div key={label} className="px-4 py-4" style={{ background: "#ffffff" }}>
            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{label}</p>
            <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Applications */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="px-5 py-3 flex items-center gap-6"
          style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
            Pending ({pending.length})
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
            Approved ({approved.length})
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>
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
