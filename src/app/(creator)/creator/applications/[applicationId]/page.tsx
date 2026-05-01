import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
    include: { campaign: true, creatorProfile: true },
  });
  if (!application || application.creatorProfile?.userId !== user.id) notFound();

  const submissions = await prisma.campaignSubmission.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
  });

  const getStatusColor = (status: string) => {
    if (status === "APPROVED" || status === "active" || status === "approved") return "#22c55e";
    if (status === "PENDING") return "#f59e0b";
    if (status === "REJECTED" || status === "rejected") return "#ef4444";
    return "#64748b";
  };

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {application.campaign.name}
        </h1>
        <span
          className="px-3 py-1 rounded text-sm font-medium"
          style={{
            color: getStatusColor(application.status),
            backgroundColor: `${getStatusColor(application.status)}20`,
          }}
        >
          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            Total Earned
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            ${Number(application.earnedAmount).toFixed(2)}
          </p>
        </div>
        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            Submissions
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            {submissions.length}
          </p>
        </div>
        <div
          className="rounded-lg p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            CPV
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            ${Number(application.campaign.creatorCpv).toFixed(4)}
          </p>
        </div>
      </div>

      {/* New Submission Button */}
      <Link href={`/creator/applications/${applicationId}/submit`}>
        <button
          className="mb-6 px-6 py-3 rounded-lg font-medium"
          style={{
            background: "var(--primary)",
            color: "#fff",
          }}
        >
          Submit Views
        </button>
      </Link>

      {/* Submissions List */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <h2
          className="px-6 py-4 font-semibold border-b"
          style={{
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
        >
          Submissions
        </h2>

        {submissions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p style={{ color: "var(--text-secondary)" }}>No submissions yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead
              style={{
                borderBottomColor: "var(--border)",
                backgroundColor: "rgba(99, 102, 241, 0.05)",
              }}
              className="border-b"
            >
              <tr style={{ color: "var(--text-secondary)" }}>
                <th className="text-left py-4 px-6">Date</th>
                <th className="text-left py-4 px-6">Claimed Views</th>
                <th className="text-left py-4 px-6">Status</th>
                <th className="text-left py-4 px-6">Earned</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  style={{ borderBottomColor: "var(--border)" }}
                  className="border-b last:border-b-0"
                >
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                    {sub.claimedViews.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className="px-3 py-1 rounded text-xs font-medium"
                      style={{
                        color: getStatusColor(sub.status),
                        backgroundColor: `${getStatusColor(sub.status)}20`,
                      }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    ${Number(sub.earnedAmount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
