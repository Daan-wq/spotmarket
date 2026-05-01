import { prisma } from "@/lib/prisma";
import { getTikTokDemographicSignedUrl } from "@/lib/supabase/storage";
import { ReviewCard } from "../../tiktok-demographics/_components/review-card";

export default async function ReviewDemographicsPage() {
  const submissions = await prisma.tikTokDemographicSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
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
  });

  const signed = await Promise.all(
    submissions.map(async (s) => {
      try {
        return { id: s.id, url: await getTikTokDemographicSignedUrl(s.screenRecordingUrl, 3600) };
      } catch {
        return { id: s.id, url: "" };
      }
    })
  );
  const urlMap = new Map(signed.map((e) => [e.id, e.url]));

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg p-8 border text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No pending submissions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {submissions.map((s) => {
        const ages = typeof s.ageBuckets === "object" && s.ageBuckets !== null
          ? (s.ageBuckets as Record<string, number>) : {};
        const countries: { iso: string; percent: number }[] =
          Array.isArray(s.topCountries) && s.topCountries.length > 0
            ? (s.topCountries as { iso: string; percent: number }[])
            : [{ iso: s.topCountry, percent: s.topCountryPercent }];
        const videoUrl = urlMap.get(s.id) ?? "";
        return (
          <div
            key={s.id}
            className="rounded-lg p-6 border grid grid-cols-1 lg:grid-cols-2 gap-6"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>@{s.connection.username}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.connection.creatorProfile.displayName} · {s.connection.creatorProfile.user.email}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Submitted {new Date(s.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>Claimed values</div>
                <table className="w-full text-sm">
                  <tbody>
                    {countries.map((c, idx) => (
                      <tr key={c.iso}>
                        <td style={{ color: "var(--text-secondary)" }}>{idx === 0 ? "Top country" : `Country ${idx + 1}`}</td>
                        <td className="text-right" style={{ color: "var(--text-primary)" }}>{c.iso} ({c.percent}%)</td>
                      </tr>
                    ))}
                    <tr><td style={{ color: "var(--text-secondary)" }}>Male</td><td className="text-right" style={{ color: "var(--text-primary)" }}>{s.malePercent}%</td></tr>
                    <tr><td style={{ color: "var(--text-secondary)" }}>Female</td><td className="text-right" style={{ color: "var(--text-primary)" }}>{s.femalePercent}%</td></tr>
                    {s.otherPercent > 0 && (
                      <tr><td style={{ color: "var(--text-secondary)" }}>Other</td><td className="text-right" style={{ color: "var(--text-primary)" }}>{s.otherPercent}%</td></tr>
                    )}
                    {Object.entries(ages).map(([age, pct]) => (
                      <tr key={age}>
                        <td style={{ color: "var(--text-secondary)" }}>Age {age}</td>
                        <td className="text-right" style={{ color: "var(--text-primary)" }}>{pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <ReviewCard submissionId={s.id} videoUrl={videoUrl} />
          </div>
        );
      })}
    </div>
  );
}
