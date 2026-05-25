import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReferralLink } from "./_components/referral-link";
import { getLocale, getTranslations } from "next-intl/server";
import { buildAppUrl, getAppUrlForLocale } from "@/lib/app-url";
import {
  buildCampaignReferralUrl,
  calculateCampaignReferralReport,
  CLIPPROFIT_CAMPAIGN_SLUG,
} from "@/lib/campaign-referrals";
import type { Locale } from "@/i18n/routing";

export default async function ReferralPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      id: true,
      referralCode: true,
    },
  });
  if (!user) throw new Error("User not found");

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.referral.page");
  const leaderboardT = await getTranslations("creator.referral.leaderboard");
  const baseUrl = getAppUrlForLocale(locale);
  const referralUrl = user.referralCode
    ? buildCampaignReferralUrl(CLIPPROFIT_CAMPAIGN_SLUG, user.referralCode, baseUrl)
    : buildAppUrl("/sign-up", baseUrl);
  const numberFormatter = new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-US");
  const percentFormatter = new Intl.NumberFormat(locale === "nl" ? "nl-NL" : "en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  });

  const campaign = await prisma.campaign.findFirst({
    where: { slug: CLIPPROFIT_CAMPAIGN_SLUG },
    select: {
      totalBudget: true,
      referralAttributions: {
        select: {
          referrerId: true,
          referredUserId: true,
          clickedAt: true,
          signedUpAt: true,
          onboardedAt: true,
          discordLinkedAt: true,
          socialConnectedAt: true,
          firstSubmissionAt: true,
          activeAt: true,
          firstEarnedAmount: true,
          referrer: {
            select: {
              email: true,
              discordUsername: true,
              creatorProfile: {
                select: {
                  displayName: true,
                  username: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const report = calculateCampaignReferralReport({
    totalBudget: Number(campaign?.totalBudget ?? 0),
    attributions:
      campaign?.referralAttributions.map((attribution) => ({
        referrerId: attribution.referrerId,
        referrerLabel: getCreatorLabel(attribution.referrer, t("anonymous")),
        referredUserId: attribution.referredUserId,
        clickedAt: attribution.clickedAt,
        signedUpAt: attribution.signedUpAt,
        onboardedAt: attribution.onboardedAt,
        discordLinkedAt: attribution.discordLinkedAt,
        socialConnectedAt: attribution.socialConnectedAt,
        firstSubmissionAt: attribution.firstSubmissionAt,
        activeAt: attribution.activeAt,
        earnedAmount: Number(attribution.firstEarnedAmount ?? 0),
      })) ?? [],
  });

  const currentStats =
    report.referrers.find((referrer) => referrer.referrerId === user.id) ??
    {
      clicks: 0,
      inviteCount: 0,
      activeClipperCount: 0,
      activationRate: 0,
    };
  const leaderboard = report.referrers.slice(0, 5);
  const currentRank =
    report.referrers.findIndex((referrer) => referrer.referrerId === user.id) + 1;

  return (
    <div className="space-y-6 md:p-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("description")}
        </p>
      </div>

      <ReferralLink referralCode={user.referralCode ?? ""} referralUrl={referralUrl} />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label={t("metrics.clicks")}
          value={numberFormatter.format(currentStats.clicks)}
          detail={t("metrics.clicksDetail")}
        />
        <MetricCard
          label={t("metrics.invites")}
          value={numberFormatter.format(currentStats.inviteCount)}
          detail={t("metrics.invitesDetail")}
        />
        <MetricCard
          label={t("metrics.activeClippers")}
          value={numberFormatter.format(currentStats.activeClipperCount)}
          detail={t("metrics.activeClippersDetail")}
        />
        <MetricCard
          label={t("metrics.conversion")}
          value={percentFormatter.format(currentStats.activationRate)}
          detail={t("metrics.conversionDetail")}
        />
      </div>

      <section
        className="rounded-lg border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("definitions.title")}
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {[t("definitions.invite"), t("definitions.active"), t("definitions.approved")].map(
            (definition) => (
              <p
                key={definition}
                className="rounded-lg border px-4 py-3 text-sm leading-6"
                style={{
                  background: "var(--bg-primary)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                {definition}
              </p>
            ),
          )}
        </div>
      </section>

      <section
        className="overflow-hidden rounded-lg border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            {leaderboardT("title")}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {leaderboardT("description")}
          </p>
        </div>
        {leaderboard.length === 0 ? (
          <p className="px-5 py-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            {leaderboardT("empty")}
          </p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {leaderboard.map((entry, index) => (
              <div
                key={entry.referrerId}
                className="grid grid-cols-[48px_1fr_auto_auto] items-center gap-3 px-5 py-4"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
                  #{index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {entry.referrerId === user.id
                      ? `${entry.referrerLabel} (${leaderboardT("you")})`
                      : entry.referrerLabel}
                  </p>
                </div>
                <p className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                  {leaderboardT("referrals")}: {numberFormatter.format(entry.inviteCount)}
                </p>
                <p className="text-right text-sm" style={{ color: "var(--text-secondary)" }}>
                  {leaderboardT("activeClippers")}:{" "}
                  {numberFormatter.format(entry.activeClipperCount)}
                </p>
              </div>
            ))}
          </div>
        )}
        {currentRank > 0 ? (
          <p className="px-5 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            {leaderboardT("yourRank", { rank: currentRank })}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div
      className="rounded-lg border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5" style={{ color: "var(--text-muted)" }}>
        {detail}
      </p>
    </div>
  );
}

function getCreatorLabel(user: {
  email: string;
  discordUsername: string | null;
  creatorProfile: { displayName: string | null; username: string | null } | null;
}, fallback: string) {
  return (
    user.creatorProfile?.displayName ??
    user.creatorProfile?.username ??
    user.discordUsername ??
    fallback
  );
}
