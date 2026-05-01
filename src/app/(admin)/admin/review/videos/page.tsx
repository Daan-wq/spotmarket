import { prisma } from "@/lib/prisma";
import SubmissionActions from "../../submissions/_components/submission-actions";

export default async function ReviewVideosPage() {
  const submissions = await prisma.campaignSubmission.findMany({
    include: { campaign: { select: { name: true } }, creator: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Source</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Submitted</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Eligible Views</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Earned</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
            <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {submissions.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No submissions yet.
              </td>
            </tr>
          )}
          {submissions.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.campaign.name}</td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.creator.email}</td>
              <td className="px-6 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.sourceMethod === "BIO_VERIFY" ? "bio-verify" : s.sourceMethod === "OAUTH" ? "oauth" : "—"}
                {s.authorHandle && <span className="block" style={{ color: "var(--text-muted)" }}>@{s.authorHandle}</span>}
              </td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.eligibleViews != null ? s.eligibleViews.toLocaleString() : "—"}</td>
              <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{Number(s.earnedAmount) > 0 ? `$${Number(s.earnedAmount).toFixed(2)}` : "—"}</td>
              <td className="px-6 py-3 text-sm">
                <span className="px-2 py-1 rounded text-xs" style={{
                  background: s.status === "APPROVED" ? "var(--success-bg)" : s.status === "PENDING" ? "var(--warning-bg)" : "var(--error-bg)",
                  color: s.status === "APPROVED" ? "var(--success-text)" : s.status === "PENDING" ? "var(--warning-text)" : "var(--error-text)",
                }}>{s.status}</span>
              </td>
              <td className="px-6 py-3 text-sm"><SubmissionActions id={s.id} status={s.status} postUrl={s.postUrl} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
