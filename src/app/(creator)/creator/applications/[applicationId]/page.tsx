import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatNumber, formatShortDate } from "@/lib/i18n-format";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isCampaignClosedForSubmissions } from "@/lib/campaign-submission-state";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.applications.detail");
  const sharedT = await getTranslations("creator.shared");
  const applicationStatusT = await getTranslations("creator.shared.statuses.application");
  const submissionStatusT = await getTranslations("creator.shared.statuses.submission");

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
  const totalEarned = submissions.reduce(
    (sum, submission) => sum + Number(submission.earnedAmount ?? 0),
    0,
  );

  const getStatusColor = (status: string) => {
    if (status === "APPROVED" || status === "active" || status === "approved") return "#22c55e";
    if (status === "PENDING") return "#f59e0b";
    if (status === "REJECTED" || status === "rejected") return "#ef4444";
    return "#64748b";
  };
  const isClosedForSubmissions = isCampaignClosedForSubmissions({
    status: application.campaign.status,
    deadline: application.campaign.deadline,
  });

  return (
    <div className="w-full space-y-6 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <h1 className="break-words text-2xl font-bold md:text-3xl" style={{ color: "var(--text-primary)" }}>
          {application.campaign.name}
        </h1>
        <span
          className="w-fit rounded px-3 py-1 text-sm font-medium"
          style={{
            color: getStatusColor(application.status),
            backgroundColor: `${getStatusColor(application.status)}20`,
          }}
        >
          {applicationStatusT(application.status)}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div
          className="rounded-2xl border p-4 md:p-6"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            {t("totalEarned")}
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            {formatCurrency(totalEarned, locale)}
          </p>
        </div>
        <div
          className="rounded-2xl border p-4 md:p-6"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            {t("submissions")}
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            {formatNumber(submissions.length, locale)}
          </p>
        </div>
        <div
          className="col-span-2 rounded-2xl border p-4 md:col-span-1 md:p-6"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mb-2">
            {t("cpm")}
          </p>
          <p
            style={{ color: "var(--primary)" }}
            className="text-2xl font-bold"
          >
            {formatCurrency(Number(application.campaign.creatorCpv) * 1000, locale)}
          </p>
        </div>
      </div>

      {/* New Submission Button */}
      {isClosedForSubmissions ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-xl px-6 py-3 font-medium text-neutral-500 md:w-auto"
          style={{
            background: "#e5e5e5",
          }}
        >
          {t("submitViews")}
        </button>
      ) : (
        <Link href={`/creator/applications/${applicationId}/submit`}>
          <button
            className="w-full rounded-xl px-6 py-3 font-medium md:w-auto"
            style={{
              background: "var(--primary)",
              color: "#fff",
            }}
          >
            {t("submitViews")}
          </button>
        </Link>
      )}

      {/* Submissions List */}
      <div
        className="rounded-2xl border overflow-hidden"
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
          {t("submissions")}
        </h2>

        {submissions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p style={{ color: "var(--text-secondary)" }}>{t("noSubmissions")}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead
                  style={{
                    borderBottomColor: "var(--border)",
                    backgroundColor: "rgba(99, 102, 241, 0.05)",
                  }}
                  className="border-b"
                >
                  <tr style={{ color: "var(--text-secondary)" }}>
                    <th className="text-left py-4 px-6">{sharedT("labels.date")}</th>
                    <th className="text-left py-4 px-6">{t("claimedViews")}</th>
                    <th className="text-left py-4 px-6">{sharedT("labels.status")}</th>
                    <th className="text-left py-4 px-6">{sharedT("labels.earned")}</th>
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
                        {formatShortDate(sub.createdAt, locale)}
                      </td>
                      <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                        {formatNumber(sub.claimedViews, locale)}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className="px-3 py-1 rounded text-xs font-medium"
                          style={{
                            color: getStatusColor(sub.status),
                            backgroundColor: `${getStatusColor(sub.status)}20`,
                          }}
                        >
                          {submissionStatusT(sub.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                        {formatCurrency(Number(sub.earnedAmount), locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {submissions.map((sub) => (
                <article
                  key={sub.id}
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {formatShortDate(sub.createdAt, locale)}
                      </p>
                      <p className="mt-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                        {formatNumber(sub.claimedViews, locale)} {sharedT("units.views")}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        color: getStatusColor(sub.status),
                        backgroundColor: `${getStatusColor(sub.status)}20`,
                      }}
                    >
                      {submissionStatusT(sub.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t("earnedLabel", { amount: formatCurrency(Number(sub.earnedAmount), locale) })}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
