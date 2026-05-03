import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/admin/kpi-card";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignHealthPage({ params }: PageProps) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSubmissions: {
        select: {
          id: true,
          creatorId: true,
          status: true,
          eligibleViews: true,
          earnedAmount: true,
          createdAt: true,
          creator: { select: { id: true, email: true } },
          submissionSignals: {
            where: { resolvedAt: null },
            select: { id: true, type: true, severity: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!campaign) return notFound();

  const totalEligibleViews = campaign.campaignSubmissions.reduce(
    (sum, submission) => sum + (submission.eligibleViews ?? 0),
    0,
  );
  const totalEarned = campaign.campaignSubmissions.reduce(
    (sum, submission) => sum + Number(submission.earnedAmount ?? 0),
    0,
  );
  const totalBudget = Number(campaign.totalBudget);
  const goalViews = campaign.goalViews ? Number(campaign.goalViews) : 0;
  const burnPct = totalBudget > 0 ? totalEarned / totalBudget : 0;
  const goalPct = goalViews > 0 ? totalEligibleViews / goalViews : 0;

  const byCreator = new Map<
    string,
    { creatorId: string; email: string; submissions: number; views: number; earned: number; flagged: number }
  >();
  for (const submission of campaign.campaignSubmissions) {
    const current =
      byCreator.get(submission.creatorId) ??
      {
        creatorId: submission.creatorId,
        email: submission.creator.email,
        submissions: 0,
        views: 0,
        earned: 0,
        flagged: 0,
      };
    current.submissions += 1;
    current.views += submission.eligibleViews ?? 0;
    current.earned += Number(submission.earnedAmount ?? 0);
    current.flagged += submission.submissionSignals.length > 0 ? 1 : 0;
    byCreator.set(submission.creatorId, current);
  }
  const leaderboard = Array.from(byCreator.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const creatorProfiles = await prisma.creatorProfile.findMany({
    where: { userId: { in: leaderboard.map((item) => item.creatorId) } },
    select: { id: true, userId: true },
  });
  const profileByUserId = new Map(creatorProfiles.map((profile) => [profile.userId, profile.id]));

  return (
    <div className="w-full p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/campaigns" className="text-xs underline" style={{ color: "var(--text-secondary)" }}>
            Back to all campaigns
          </Link>
          <h1 className="mb-1 mt-2 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {campaign.name}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {campaign.status} · deadline {campaign.deadline.toLocaleDateString()} ·{" "}
            {campaign.platform.toLowerCase()}
          </p>
        </div>
        <Link
          href={`/admin/campaigns/${campaign.id}/edit`}
          className="rounded-md px-3 py-1.5 text-xs font-medium"
          style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Edit campaign
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Budget burn"
            value={`$${totalEarned.toFixed(2)}`}
            hint={`of $${totalBudget.toFixed(2)} (${Math.round(burnPct * 100)}%)`}
            tone={burnPct > 0.9 ? "warning" : "default"}
          />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[240px]">
          <KpiCard
            label="Goal views"
            value={totalEligibleViews.toLocaleString()}
            hint={goalViews > 0 ? `of ${goalViews.toLocaleString()} (${Math.round(goalPct * 100)}%)` : "no goal set"}
            tone={goalViews > 0 && goalPct < 0.5 ? "warning" : "default"}
          />
        </div>
        <div className="w-full sm:w-[190px] xl:w-[210px]">
          <KpiCard label="Submissions" value={campaign.campaignSubmissions.length} hint="all statuses" />
        </div>
        <div className="w-full sm:w-[220px] xl:w-[250px]">
          <KpiCard
            label="Active creators"
            value={byCreator.size}
            hint="unique creators with submissions"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Submission feed
            </h2>
          </div>
          {campaign.campaignSubmissions.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No submissions yet.
            </p>
          ) : (
            <ul>
              {campaign.campaignSubmissions.slice(0, 30).map((submission) => (
                <li
                  key={submission.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                      <span className="font-medium">{submission.creator.email}</span>
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {submission.createdAt.toLocaleString()}
                    </p>
                    {submission.submissionSignals.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {submission.submissionSignals.map((signal) => (
                          <span
                            key={signal.id}
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                            style={{
                              background: signal.severity === "CRITICAL" ? "var(--error-bg)" : "var(--warning-bg)",
                              color: signal.severity === "CRITICAL" ? "var(--error-text)" : "var(--warning-text)",
                            }}
                          >
                            {signal.type.replaceAll("_", " ").toLowerCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {(submission.eligibleViews ?? 0).toLocaleString()} v
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      ${Number(submission.earnedAmount ?? 0).toFixed(2)}
                    </span>
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background:
                          submission.status === "APPROVED"
                            ? "var(--success-bg)"
                            : submission.status === "REJECTED"
                              ? "var(--error-bg)"
                              : "var(--warning-bg)",
                        color:
                          submission.status === "APPROVED"
                            ? "var(--success-text)"
                            : submission.status === "REJECTED"
                              ? "var(--error-text)"
                              : "var(--warning-text)",
                      }}
                    >
                      {submission.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="overflow-hidden rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Creator leaderboard
            </h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Creator
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Submissions
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Views
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Earned
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Flagged
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((creator) => {
                    const profileId = profileByUserId.get(creator.creatorId);
                    return (
                      <tr key={creator.creatorId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="max-w-[220px] px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                          {profileId ? (
                            <Link href={`/admin/creators/${profileId}`} className="block truncate underline">
                              {creator.email}
                            </Link>
                          ) : (
                            <span className="block truncate">{creator.email}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {creator.submissions}
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {creator.views.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right text-sm tabular-nums" style={{ color: "var(--text-primary)" }}>
                          ${creator.earned.toFixed(2)}
                        </td>
                        <td
                          className="px-5 py-3 text-right text-sm tabular-nums"
                          style={{ color: creator.flagged > 0 ? "var(--warning-text)" : "var(--text-secondary)" }}
                        >
                          {creator.flagged}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
