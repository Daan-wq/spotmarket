import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/admin/kpi-card";
import { CreatorScoreCell } from "@/components/admin/creator-score-cell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ creatorId: string }>;
}

function ScoreSparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Need at least 2 score points for a sparkline.
      </p>
    );
  }
  const w = 240;
  const h = 48;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Score history">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
    </svg>
  );
}

function tokenHealth(expiresAt: Date | null): { label: string; color: string; bg: string } {
  if (!expiresAt) return { label: "Unknown", color: "var(--text-secondary)", bg: "var(--bg-primary)" };
  if (expiresAt.getTime() < Date.now())
    return { label: "Expired", color: "var(--error-text)", bg: "var(--error-bg)" };
  const days = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 7) return { label: `${Math.round(days)}d left`, color: "var(--warning-text)", bg: "var(--warning-bg)" };
  return { label: "Healthy", color: "var(--success-text)", bg: "var(--success-bg)" };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { creatorId } = await params;

  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
      igConnections: true,
      ttConnections: true,
      ytConnections: true,
      fbConnections: true,
    },
  });
  if (!profile) return notFound();

  const userId = profile.user.id;

  const [scores, submissions] = await Promise.all([
    prisma.clipperPerformanceScore.findMany({
      where: { creatorProfileId: profile.id },
      orderBy: { computedAt: "asc" },
      take: 30,
    }),
    prisma.campaignSubmission.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        campaign: { select: { id: true, name: true } },
        submissionSignals: {
          select: { id: true, type: true, severity: true, createdAt: true, resolvedAt: true },
        },
      },
    }),
  ]);

  const latestScore = scores.length ? scores[scores.length - 1] : null;

  const totalEarned = submissions.reduce((s, x) => s + Number(x.earnedAmount ?? 0), 0);
  const approved = submissions.filter((s) => s.status === "APPROVED").length;
  const approvalRate = submissions.length > 0 ? (approved / submissions.length) * 100 : 0;

  const allSignals = submissions.flatMap((s) =>
    s.submissionSignals.map((sig) => ({
      ...sig,
      campaignName: s.campaign.name,
      submissionId: s.id,
    }))
  );
  allSignals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const connections: Array<{
    type: "IG" | "TT" | "YT" | "FB";
    handle: string;
    followers: number | null;
    expiresAt: Date | null;
    isVerified: boolean;
  }> = [
    ...profile.igConnections.map((c) => ({
      type: "IG" as const,
      handle: `@${c.igUsername}`,
      followers: c.followerCount,
      expiresAt: c.tokenExpiresAt,
      isVerified: c.isVerified,
    })),
    ...profile.ttConnections.map((c) => ({
      type: "TT" as const,
      handle: `@${c.username}`,
      followers: c.followerCount,
      expiresAt: c.tokenExpiresAt,
      isVerified: c.isVerified,
    })),
    ...profile.ytConnections.map((c) => ({
      type: "YT" as const,
      handle: c.channelName,
      followers: c.subscriberCount,
      expiresAt: c.tokenExpiresAt,
      isVerified: c.isVerified,
    })),
    ...profile.fbConnections.map((c) => ({
      type: "FB" as const,
      handle: c.pageName,
      followers: c.followerCount,
      expiresAt: c.tokenExpiresAt,
      isVerified: c.isVerified,
    })),
  ];

  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <Link href="/admin/creators" className="text-xs underline" style={{ color: "var(--text-secondary)" }}>
          ← All creators
        </Link>
        <h1 className="text-3xl font-bold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>
          {profile.displayName}
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          {profile.user.email} · joined {profile.user.createdAt.toLocaleDateString()}
          {profile.isVerified ? " · ✓ verified" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div
          className="rounded-xl px-4 py-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Performance score
          </p>
          <div className="mt-2">
            <CreatorScoreCell score={latestScore?.score ?? null} sampleSize={latestScore?.sampleSize ?? null} />
          </div>
          <div className="mt-3">
            <ScoreSparkline points={scores.map((s) => s.score)} />
          </div>
        </div>
        <KpiCard label="Approval rate" value={`${approvalRate.toFixed(0)}%`} hint={`${approved} / ${submissions.length}`} />
        <KpiCard label="Total earned" value={`$${totalEarned.toFixed(2)}`} hint={`${submissions.length} submissions`} />
        <KpiCard label="Followers" value={profile.totalFollowers.toLocaleString()} hint={profile.primaryGeo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <section
          className="rounded-xl overflow-hidden lg:col-span-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Submission feed
            </h2>
          </div>
          {submissions.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No submissions yet.
            </p>
          ) : (
            <ul>
              {submissions.slice(0, 20).map((s) => (
                <li
                  key={s.id}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/campaigns/${s.campaign.id}`}
                      className="text-sm font-medium block truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.campaign.name}
                    </Link>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {s.createdAt.toLocaleString()}
                      {s.submissionSignals.length > 0 ? ` · ${s.submissionSignals.length} signals` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {(s.eligibleViews ?? 0).toLocaleString()} v · ${Number(s.earnedAmount ?? 0).toFixed(2)}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        background:
                          s.status === "APPROVED"
                            ? "var(--success-bg)"
                            : s.status === "REJECTED"
                            ? "var(--error-bg)"
                            : "var(--warning-bg)",
                        color:
                          s.status === "APPROVED"
                            ? "var(--success-text)"
                            : s.status === "REJECTED"
                            ? "var(--error-text)"
                            : "var(--warning-text)",
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              OAuth connections
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
              Verifications & token health (folded from /admin/verifications)
            </p>
          </div>
          {connections.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              No platform connections yet.
            </p>
          ) : (
            <ul>
              {connections.map((c, i) => {
                const health = tokenHealth(c.expiresAt);
                return (
                  <li
                    key={`${c.type}-${i}`}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        <span
                          className="text-[10px] mr-2 px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
                        >
                          {c.type}
                        </span>
                        {c.handle}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {c.followers != null ? `${c.followers.toLocaleString()} followers` : "—"}
                        {c.isVerified ? " · ✓ verified" : ""}
                      </p>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{ background: health.bg, color: health.color }}
                    >
                      {health.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Signal history
          </h2>
        </div>
        {allSignals.length === 0 ? (
          <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            No signals fired against this creator's submissions.
          </p>
        ) : (
          <ul>
            {allSignals.slice(0, 30).map((sig) => (
              <li
                key={sig.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {sig.type.replaceAll("_", " ").toLowerCase()}{" "}
                    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      · {sig.campaignName}
                    </span>
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {sig.createdAt.toLocaleString()}
                    {sig.resolvedAt ? ` · resolved ${sig.resolvedAt.toLocaleDateString()}` : ""}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
                  style={{
                    background: sig.severity === "CRITICAL" ? "var(--error-bg)" : sig.severity === "WARN" ? "var(--warning-bg)" : "var(--bg-primary)",
                    color: sig.severity === "CRITICAL" ? "var(--error-text)" : sig.severity === "WARN" ? "var(--warning-text)" : "var(--text-secondary)",
                  }}
                >
                  {sig.severity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
