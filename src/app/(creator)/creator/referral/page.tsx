import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReferralLink } from "./_components/referral-link";
import { getLocale, getTranslations } from "next-intl/server";
import { buildAppUrl, getAppUrlForLocale } from "@/lib/app-url";
import {
  buildCampaignReferralUrl,
  CLIPPROFIT_CAMPAIGN_SLUG,
} from "@/lib/campaign-referrals";
import type { Locale } from "@/i18n/routing";

export default async function ReferralPage() {
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: {
      referralCode: true,
    },
  });
  if (!user) throw new Error("User not found");

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.referral.page");
  const baseUrl = getAppUrlForLocale(locale);
  const referralUrl = user.referralCode
    ? buildCampaignReferralUrl(CLIPPROFIT_CAMPAIGN_SLUG, user.referralCode, baseUrl)
    : buildAppUrl("/sign-up", baseUrl);

  return (
    <div className="space-y-6 md:p-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("title")}
        </h1>
      </div>

      <ReferralLink referralCode={user.referralCode ?? ""} referralUrl={referralUrl} />
    </div>
  );
}
