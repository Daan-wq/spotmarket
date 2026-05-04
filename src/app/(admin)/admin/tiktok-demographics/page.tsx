import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTikTokDemographicSignedUrl } from "@/lib/supabase/storage";
import { VerificationStatus } from "@prisma/client";
import Link from "next/link";
import { ReviewCard } from "./_components/review-card";

const STATUS_TABS: { value: VerificationStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "FAILED", label: "Declined" },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminTikTokDemographicsPage({ searchParams }: PageProps) {
  await requireAuth("admin");

  const sp = await searchParams;
  const requestedStatus = (sp.status ?? "PENDING").toUpperCase();
  const activeStatus: VerificationStatus = STATUS_TABS.find((t) => t.value === requestedStatus)?.value ?? "PENDING";

  const submissions = await prisma.tikTokDemographicSubmission.findMany({
    where: { status: activeStatus },
    orderBy: activeStatus === "PENDING" ? { createdAt: "asc" } : { reviewedAt: "desc" },
    include: {
      connection: {
        select: {
          id: true,
          username: true,
          displayName: true,
          creatorProfile: { select: { id: true, displayName: true, user: { select: { email: true } } } },
        },
      },
    },
    take: 50,
  });

  const counts = await prisma.tikTokDemographicSubmission.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.status, c._count._all]));

  const signed = await Promise.all(
    submissions.map(async (s) => {
      try {
        return { id: s.id, url: await getTikTokDemographicSignedUrl(s.screenRecordingUrl, 3600) };
      } catch {
        return { id: s.id, url: "" };
      }
    }),
  );
  const urlMap = new Map(signed.map((e) => [e.id, e.url]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          TikTok Demographics Review
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Review creator-submitted demographics + screen recording proof.
        </p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {STATUS_TABS.map((tab) => {
          const active = tab.value === activeStatus;
          const count = countMap.get(tab.value) ?? 0;
          return (
            <Link
              key={tab.value}
              href={`/admin/tiktok-demographics?status=${tab.value}`}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: active ? "var(--primary)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {tab.label} <span className="opacity-60">({count})</span>
            </Link>
          );
        })}
      </div>

      {submissions.length === 0 ? (
        <div
          className="rounded-lg p-8 border text-center"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No {activeStatus.toLowerCase()} submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {submissions.map((s) => {
            const ages =
              typeof s.ageBuckets === "object" && s.ageBuckets !== null
                ? (s.ageBuckets as Record<string, number>)
                : {};
            const videoUrl = urlMap.get(s.id) ?? "";
            return (
              <div
                key={s.id}
                className="rounded-lg p-6 border grid grid-cols-1 lg:grid-cols-2 gap-6"
                style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      @{s.connection.username}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {s.connection.creatorProfile.displayName} · {s.connection.creatorProfile.user.email}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      Submitted {new Date(s.createdAt).toLocaleString()}
                    </p>
                    {s.reviewedAt && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Reviewed {new Date(s.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                      Claimed values
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td style={{ color: "var(--text-secondary)" }}>Top country</td>
                          <td className="text-right" style={{ color: "var(--text-primary)" }}>
                            {s.topCountry} ({s.topCountryPercent}%)
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: "var(--text-secondary)" }}>Male</td>
                          <td className="text-right" style={{ color: "var(--text-primary)" }}>
                            {s.malePercent}%
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: "var(--text-secondary)" }}>Female</td>
                          <td className="text-right" style={{ color: "var(--text-primary)" }}>
                            {s.femalePercent}%
                          </td>
                        </tr>
                        <tr>
                          <td style={{ color: "var(--text-secondary)" }}>Other</td>
                          <td className="text-right" style={{ color: "var(--text-primary)" }}>
                            {s.otherPercent}%
                          </td>
                        </tr>
                        {Object.entries(ages).map(([age, pct]) => (
                          <tr key={age}>
                            <td style={{ color: "var(--text-secondary)" }}>Age {age}</td>
                            <td className="text-right" style={{ color: "var(--text-primary)" }}>
                              {pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {s.reviewNotes && (
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
                        Review notes
                      </div>
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{s.reviewNotes}</p>
                    </div>
                  )}
                </div>

                {activeStatus === "PENDING" ? (
                  <ReviewCard submissionId={s.id} videoUrl={videoUrl} />
                ) : (
                  <div className="space-y-2">
                    <video
                      src={videoUrl}
                      controls
                      className="w-full rounded-md border"
                      style={{ borderColor: "var(--border)", maxHeight: 360 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
