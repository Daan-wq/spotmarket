import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { getAppUrlFromRequest } from "@/lib/app-url";
import {
  CLIPPROFIT_CAMPAIGN_SLUG,
  normalizeCampaignSlug,
} from "@/lib/campaign-referrals";
import { normalizeReferralCode } from "@/lib/referral";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignSlug: string; referralCode: string }> },
) {
  const { campaignSlug: rawCampaignSlug, referralCode: rawReferralCode } =
    await params;
  const campaignSlug = normalizeCampaignSlug(rawCampaignSlug);
  const referralCode = normalizeReferralCode(rawReferralCode);
  const baseUrl = getAppUrlFromRequest(request);

  if (!campaignSlug || !referralCode) {
    return NextResponse.redirect(
      new URL("/sign-up?campaign_error=invalid_link", baseUrl),
    );
  }

  const campaign = await prisma.campaign.findFirst({
    where:
      campaignSlug === CLIPPROFIT_CAMPAIGN_SLUG
        ? {
            OR: [
              { slug: campaignSlug },
              { name: { equals: "ClipProfit", mode: "insensitive" } },
            ],
          }
        : { slug: campaignSlug },
    select: { id: true, slug: true, name: true },
  });

  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true, role: true },
  });

  if (!campaign || !referrer || referrer.role !== "creator") {
    return NextResponse.redirect(
      new URL("/sign-up?campaign_error=invalid_link", baseUrl),
    );
  }

  const clickId = nanoid(18);
  await prisma.campaignReferralAttribution.create({
    data: {
      campaignId: campaign.id,
      referrerId: referrer.id,
      referralCode,
      clickId,
    },
  });

  const redirectUrl = new URL("/sign-up", baseUrl);
  redirectUrl.searchParams.set("ref", referralCode);
  redirectUrl.searchParams.set("campaign", campaign.slug ?? campaignSlug);
  redirectUrl.searchParams.set("click", clickId);

  return NextResponse.redirect(redirectUrl);
}
