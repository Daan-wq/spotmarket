import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import SubmissionActions from "./_components/submission-actions";

export default async function AdvertiserSubmissionsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  // Get the advertiser's profile to find their campaigns
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true, advertiserProfile: { select: { id: true } } },
  });
  if (!user || user.role !== "advertiser" || !user.advertiserProfile) redirect("/unauthorized");

  const submissions = await prisma.campaignSubmission.findMany({
    where: { campaign: { advertiserId: user.advertiserProfile.id } },
    include: {
      campaign: { select: { name: true } },
      creator: { select: { email: true, creatorProfile: { select: { displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Submissions</h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Review creator submissions for your campaigns</p>
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Claimed Views</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No submissions yet
                </td>
              </tr>
            ) : (
              submissions.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.campaign.name}</td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                    {s.creator.creatorProfile?.displayName || s.creator.email}
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-primary)" }}>{s.claimedViews.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{
                        background: s.status === "APPROVED" ? "var(--success-bg)" : s.status === "PENDING" ? "var(--warning-bg)" : "var(--error-bg)",
                        color: s.status === "APPROVED" ? "var(--success-text)" : s.status === "PENDING" ? "var(--warning-text)" : "var(--error-text)"
                      }}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <SubmissionActions submissionId={s.id} status={s.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
