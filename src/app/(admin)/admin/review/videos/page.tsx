import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LogoReviewWidget } from "@/components/admin/logo-review-widget";
import SubmissionActions from "../../submissions/_components/submission-actions";

export const dynamic = "force-dynamic";

/**
 * Submission review queue with manual logo verification widget.
 *
 * Per charter: thumbnail comes from platform OAuth fetchers (Subsystem A).
 * Until A ships those, we render a placeholder — the verdict buttons still work.
 */
function platformFromBio(p: string | null): "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS" | "FACEBOOK" | null {
  if (!p) return null;
  if (p === "INSTAGRAM" || p === "TIKTOK" || p === "YOUTUBE_SHORTS" || p === "FACEBOOK") return p;
  return null;
}

export default async function VideoReviewPage() {
  const submissions = await prisma.campaignSubmission.findMany({
    where: { status: { in: ["PENDING", "FLAGGED"] } },
    orderBy: { createdAt: "asc" },
    include: {
      campaign: { select: { id: true, name: true } },
      creator: { select: { id: true, email: true } },
      submissionSignals: {
        where: { resolvedAt: null },
        select: { id: true, type: true, severity: true },
      },
    },
    take: 100,
  });

  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Video review
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Verify the brand logo is present in each post, then approve or reject.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
            All caught up
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            No pending or flagged submissions to review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => {
            const platform = platformFromBio(s.sourcePlatform);
            // Thumbnail: TODO once Subsystem A ships platform OAuth fetchers.
            // For now we rely on screenshotUrl if the creator provided one as a fallback.
            const thumbnailUrl = s.screenshotUrl ?? null;
            const logoStatus = (s.logoStatus ?? "PENDING") as "PENDING" | "PRESENT" | "MISSING";
            const canApprove = logoStatus === "PRESENT";

            return (
              <article
                key={s.id}
                className="rounded-xl p-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/campaigns/${s.campaignId}`}
                      className="text-base font-semibold block truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.campaign.name}
                    </Link>
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      <Link
                        href={`/admin/creators?focus=${s.creator.id}`}
                        className="underline"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {s.creator.email}
                      </Link>
                      {" · "}
                      submitted {s.createdAt.toLocaleDateString()}
                      {platform ? ` · ${platform.toLowerCase()}` : ""}
                      {s.authorHandle ? ` · @${s.authorHandle}` : ""}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase"
                    style={{
                      background: s.status === "FLAGGED" ? "var(--error-bg)" : "var(--warning-bg)",
                      color: s.status === "FLAGGED" ? "var(--error-text)" : "var(--warning-text)",
                    }}
                  >
                    {s.status}
                  </span>
                </header>

                {s.submissionSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {s.submissionSignals.map((sig) => (
                      <span
                        key={sig.id}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
                        style={{
                          background: sig.severity === "CRITICAL" ? "var(--error-bg)" : "var(--warning-bg)",
                          color: sig.severity === "CRITICAL" ? "var(--error-text)" : "var(--warning-text)",
                        }}
                      >
                        {sig.type.replaceAll("_", " ").toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                  <LogoReviewWidget
                    submissionId={s.id}
                    thumbnailUrl={thumbnailUrl}
                    postUrl={s.postUrl}
                    initialStatus={logoStatus}
                    initialVerifiedAt={s.logoVerifiedAt?.toISOString() ?? null}
                    initialVerifiedBy={s.logoVerifiedBy}
                  />

                  <div
                    className="rounded-lg p-3"
                    style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-[11px] uppercase tracking-wide font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                      Approve / reject
                    </p>
                    {canApprove ? (
                      <SubmissionActions id={s.id} status={s.status} postUrl={s.postUrl} />
                    ) : (
                      <p className="text-[11px]" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
                        Approve unlocks once logo is marked <strong>Present</strong>. Logo currently:{" "}
                        <strong>{logoStatus}</strong>.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
