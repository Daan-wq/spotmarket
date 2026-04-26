import { prisma } from "@/lib/prisma";
import SubmissionActions from "./_components/submission-actions";

export default async function SubmissionsPage() {
  const submissions = await prisma.campaignSubmission.findMany({
    include: { campaign: { select: { name: true } }, creator: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Submissions</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Review and approve submissions — enter baseline &amp; current views to calculate eligible views</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Source</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Last Scrape</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Eligible Views</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Earned</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.campaign.name}</td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.creator.email}</td>
                <td className="px-6 py-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    {s.sourcePlatform && (
                      <span style={{ color: "var(--text-secondary)" }}>{s.sourcePlatform.toLowerCase()}</span>
                    )}
                    {s.sourceMethod === "BIO_VERIFY" ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded font-medium w-fit"
                        style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                      >
                        bio-verify
                      </span>
                    ) : s.sourceMethod === "OAUTH" ? (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded font-medium w-fit"
                        style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
                      >
                        oauth
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                    {s.authorHandle && (
                      <span style={{ color: "var(--text-muted)" }}>@{s.authorHandle}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {s.lastScrapedAt ? new Date(s.lastScrapedAt).toLocaleString() : "—"}
                  {s.scrapeFailures > 0 && (
                    <span className="block text-[10px]" style={{ color: "var(--error-text)" }}>
                      {s.scrapeFailures} failure{s.scrapeFailures === 1 ? "" : "s"}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                  {s.eligibleViews != null ? s.eligibleViews.toLocaleString() : '-'}
                </td>
                <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                  {Number(s.earnedAmount) > 0 ? `$${Number(s.earnedAmount).toFixed(2)}` : '-'}
                </td>
                <td className="px-6 py-3 text-sm"><span className="px-2 py-1 rounded text-xs" style={{ background: s.status === "APPROVED" ? "var(--success-bg)" : s.status === "PENDING" ? "var(--warning-bg)" : "var(--error-bg)", color: s.status === "APPROVED" ? "var(--success-text)" : s.status === "PENDING" ? "var(--warning-text)" : "var(--error-text)" }}>{s.status}</span></td>
                <td className="px-6 py-3 text-sm"><SubmissionActions id={s.id} status={s.status} postUrl={s.postUrl} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
