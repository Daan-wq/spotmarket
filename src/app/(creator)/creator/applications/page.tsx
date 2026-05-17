import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatShortDate } from "@/lib/i18n-format";
import { prisma } from "@/lib/prisma";

export default async function ApplicationsPage() {
  const { userId } = await requireAuth("creator");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.applications.page");
  const sharedT = await getTranslations("creator.shared");
  const statusT = await getTranslations("creator.shared.statuses.application");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const applications = await prisma.campaignApplication.findMany({
    where: { creatorProfileId: profile.id },
    include: { campaign: { select: { name: true } } },
    orderBy: { appliedAt: "desc" },
  });

  const getStatusColor = (status: string) => {
    if (status === "approved" || status === "active") return "#22c55e";
    if (status === "pending") return "#f59e0b";
    if (status === "rejected") return "#ef4444";
    return "#64748b";
  };

  return (
    <div className="w-full space-y-5 md:p-6">
      <h1 className="text-2xl font-bold md:text-3xl" style={{ color: "var(--text-primary)" }}>
        {t("title")}
      </h1>

      {applications.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center border md:p-12"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <p style={{ color: "var(--text-secondary)" }}>
            {t("empty")}
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
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
                <th className="text-left py-4 px-6">{sharedT("labels.campaign")}</th>
                <th className="text-left py-4 px-6">{sharedT("labels.status")}</th>
                <th className="text-left py-4 px-6">{sharedT("labels.earned")}</th>
                <th className="text-left py-4 px-6">{t("applied")}</th>
                <th className="text-left py-4 px-6">{sharedT("labels.action")}</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  style={{ borderBottomColor: "var(--border)" }}
                  className="border-b last:border-b-0 hover:bg-opacity-50 transition-colors"
                >
                  <td className="py-4 px-6" style={{ color: "var(--text-primary)" }}>
                    {app.campaign.name}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className="px-3 py-1 rounded text-xs font-medium"
                      style={{
                        color: getStatusColor(app.status),
                        backgroundColor: `${getStatusColor(app.status)}20`,
                      }}
                    >
                      {statusT(app.status)}
                    </span>
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {formatCurrency(app.earnedAmount / 100, locale)}
                  </td>
                  <td className="py-4 px-6" style={{ color: "var(--text-secondary)" }}>
                    {formatShortDate(app.appliedAt, locale)}
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      href={`/creator/applications/${app.id}`}
                      className="text-sm font-medium transition-colors"
                      style={{ color: "var(--primary)" }}
                    >
                      {sharedT("actions.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="space-y-3 p-3 md:hidden">
            {applications.map((app) => (
              <article
                key={app.id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2
                    className="min-w-0 break-words text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {app.campaign.name}
                  </h2>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      color: getStatusColor(app.status),
                      backgroundColor: `${getStatusColor(app.status)}20`,
                    }}
                  >
                    {statusT(app.status)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {sharedT("labels.earned")}
                    </p>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(app.earnedAmount / 100, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {t("applied")}
                    </p>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {formatShortDate(app.appliedAt, locale)}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/creator/applications/${app.id}`}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {sharedT("actions.view")}
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
