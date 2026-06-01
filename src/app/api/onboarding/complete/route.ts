import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { isValidTronAddress } from "@/lib/validation/tron";
import {
  CLIPPROFIT_CAMPAIGN_SLUG,
  normalizeCampaignSlug,
} from "@/lib/campaign-referrals";
import { buildFirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";
import { normalizeReferralCode } from "@/lib/referral";
import { createUniqueUsername } from "@/lib/username";

const VALID_ROLES = ["creator"] as const;

function generateReferralCode(): string {
  return nanoid(8).toUpperCase();
}

async function uniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
    code = generateReferralCode();
    attempts++;
  }
  return code;
}

export async function POST(req: Request) {
  try {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayName = (body.displayName as string)?.trim();
  const refCode = normalizeReferralCode(body.referralCode as string | undefined);
  const campaignSlug = normalizeCampaignSlug(body.campaignSlug as string | undefined);
  const campaignClickId = (body.campaignClickId as string | undefined)?.trim();
  const tronsAddress = (body.tronsAddress as string | undefined)?.trim();
  const role = body.role as string | undefined;
  const attributionSource = (body.attributionSource as string | undefined)?.trim();
  const experienceLevel = (body.experienceLevel as string | undefined)?.trim();
  const portfolioVideoUrl = (body.portfolioVideoUrl as string | undefined)?.trim();

  if (!displayName) {
    return NextResponse.json({ error: "Display name is required" }, { status: 400 });
  }

  if (tronsAddress && !isValidTronAddress(tronsAddress)) {
    return NextResponse.json({ error: "Invalid Tron wallet address" }, { status: 400 });
  }

  const selectedRole = role && VALID_ROLES.includes(role as typeof VALID_ROLES[number])
    ? (role as typeof VALID_ROLES[number])
    : "creator";

  const campaignAttribution =
    campaignSlug && campaignClickId && refCode
      ? await prisma.campaignReferralAttribution.findUnique({
          where: { clickId: campaignClickId },
          select: {
            id: true,
            campaignId: true,
            referrerId: true,
            referralCode: true,
            referredUserId: true,
            campaign: { select: { slug: true, name: true } },
            referrer: {
              select: { role: true, email: true, supabaseId: true },
            },
          },
        })
      : null;
  const validCampaignAttribution =
    campaignAttribution &&
    campaignAttribution.referralCode === refCode &&
    campaignAttribution.referrer.role === "creator" &&
    campaignAttribution.referrer.supabaseId !== authUser.id &&
    campaignAttribution.referrer.email !== authUser.email &&
    (campaignAttribution.campaign.slug === campaignSlug ||
      (campaignSlug === CLIPPROFIT_CAMPAIGN_SLUG &&
        campaignAttribution.campaign.name.toLowerCase() === "clipprofit"))
      ? campaignAttribution
      : null;

  // Resolve generic cash referrer only when this is not a campaign attribution.
  let referredById: string | undefined;
  if (refCode && !campaignSlug && !validCampaignAttribution) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: refCode },
      select: { id: true, role: true, email: true, supabaseId: true },
    });
    const isSelfReferral = referrer?.supabaseId === authUser.id || referrer?.email === authUser.email;
    if (referrer && referrer.role === "creator" && !isSelfReferral) {
      referredById = referrer.id;
    }
  }

  const referralCode = await uniqueReferralCode();

  // Handle re-signup: if a User record exists for this email with a stale supabaseId, update it
  const existingByEmail = await prisma.user.findUnique({ where: { email: authUser.email ?? "" } });
  if (existingByEmail && existingByEmail.supabaseId !== authUser.id) {
    await prisma.user.update({ where: { id: existingByEmail.id }, data: { supabaseId: authUser.id } });
  }

  const admin = createSupabaseAdminClient();
  await admin.auth.admin.updateUserById(authUser.id, {
    user_metadata: { role: selectedRole },
  });

  // Extract Discord info from OAuth metadata if available
  const provider = authUser.app_metadata?.provider;
  const discordId = provider === "discord"
    ? (authUser.user_metadata?.provider_id ?? authUser.user_metadata?.sub ?? null)
    : null;
  const discordUsername = provider === "discord"
    ? (authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null)
    : null;

  const user = await prisma.user.upsert({
    where: { supabaseId: authUser.id },
    update: { role: selectedRole },
    create: {
      supabaseId: authUser.id,
      email: authUser.email ?? "",
      role: selectedRole,
      referralCode,
      referredBy: referredById,
      ...(discordId ? { discordId, discordUsername } : {}),
    },
    include: { creatorProfile: true },
  });

  if (
    validCampaignAttribution &&
    (!validCampaignAttribution.referredUserId ||
      validCampaignAttribution.referredUserId === user.id)
  ) {
    const existingAttribution = await prisma.campaignReferralAttribution.findFirst({
      where: {
        campaignId: validCampaignAttribution.campaignId,
        referredUserId: user.id,
      },
      select: { id: true },
    });
    const attributionId = existingAttribution?.id ?? validCampaignAttribution.id;
    const now = new Date();

    if (!existingAttribution) {
      await prisma.campaignReferralAttribution.update({
        where: { id: attributionId },
        data: { referredUserId: user.id },
      });
    }

    await prisma.campaignReferralAttribution.updateMany({
      where: { id: attributionId, signedUpAt: null },
      data: { signedUpAt: now },
    });
    await prisma.campaignReferralAttribution.updateMany({
      where: { id: attributionId, onboardedAt: null },
      data: { onboardedAt: now },
    });
    if (discordId) {
      await prisma.campaignReferralAttribution.updateMany({
        where: { id: attributionId, discordLinkedAt: null },
        data: { discordLinkedAt: now },
      });
    }
  }

  const username = await createUniqueUsername(displayName, async (candidate) => {
    const existing = await prisma.creatorProfile.findUnique({
      where: { username: candidate },
      select: { userId: true },
    });
    return Boolean(existing && existing.userId !== user.id);
  });

  if (!user.creatorProfile) {
    await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        username,
        displayName,
        tronsAddress: tronsAddress ?? null,
        attributionSource: attributionSource ?? null,
        experienceLevel: experienceLevel ?? null,
        portfolioVideoUrl: portfolioVideoUrl ?? null,
      },
    });
  } else {
    await prisma.creatorProfile.update({
      where: { userId: user.id },
      data: {
        ...(tronsAddress ? { tronsAddress } : {}),
        ...(user.creatorProfile.username ? {} : { username }),
        ...(attributionSource ? { attributionSource } : {}),
        ...(experienceLevel ? { experienceLevel } : {}),
        ...(portfolioVideoUrl ? { portfolioVideoUrl } : {}),
      },
    });
  }

  const firstClipStatus = buildFirstClipOnboardingStatus({
    discordConnected: Boolean(user.discordId ?? discordId),
    accountConnected: false,
    joinedApplicationId: null,
    firstClipSubmitted: false,
  });

  return NextResponse.json({
    success: true,
    redirect: firstClipStatus.nextHref,
    firstClipNextHref: firstClipStatus.nextHref,
    firstClipNextStep: firstClipStatus.nextStep,
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[onboarding/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
