import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAppUrl, getAppUrlFromRequest, getLocaleFromRequest } from "@/lib/app-url";
import { getAuthEmailLocale, sendAuthEmail } from "@/lib/auth-email";
import { normalizeCampaignSlug } from "@/lib/campaign-referrals";
import { getTranslations } from "next-intl/server";
import { assessBanEvasion } from "@/lib/ban-evasion/enforcement";
import { recordAccessSignals } from "@/lib/ban-evasion/store";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
  campaign: z.string().optional(),
  click: z.string().optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export async function POST(request: Request) {
  const locale = getLocaleFromRequest(request);
  const emailLocale = getAuthEmailLocale(request);
  const t = await getTranslations({ locale, namespace: "auth.api" });
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: t("invalidInput"), details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { password, ref } = parsed.data;
  const campaignSlug = normalizeCampaignSlug(parsed.data.campaign);
  const clickId = parsed.data.click?.trim() || undefined;
  const email = parsed.data.email.toLowerCase();
  const banAssessment = await assessBanEvasion({
    request,
    subjectRole: "creator",
    turnstileToken: parsed.data.turnstileToken,
  });

  if (banAssessment.decision === "BLOCK") {
    return NextResponse.json(
      { error: "Access unavailable." },
      { status: 403 },
    );
  }
  if (banAssessment.decision === "CHALLENGE") {
    return NextResponse.json(
      {
        challengeRequired: true,
        siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
      },
      { status: 428 },
    );
  }

  // Rate limit: 1 ticket per email per 60s
  const recentTicket = await prisma.signupTicket.findFirst({
    where: {
      email,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentTicket) {
    return NextResponse.json(
      { error: t("rateLimited") },
      { status: 429 }
    );
  }

  // Create Supabase user (unconfirmed)
  const admin = createSupabaseAdminClient();
  const { data: createData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { role: "creator" },
      app_metadata: { user_role: "creator" },
    });

  if (createError) {
    if (createError.message?.includes("already been registered")) {
      return NextResponse.json(
        { error: t("alreadyExists") },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: createError.message || t("createFailed") },
      { status: 500 }
    );
  }

  if (!createData.user?.id) {
    return NextResponse.json(
      { error: t("createFailed") },
      { status: 500 },
    );
  }

  try {
    await recordAccessSignals({
      supabaseId: createData.user.id,
      source: "signup",
      observations: banAssessment.observations,
    });
  } catch (error) {
    console.error("[signup] Failed to record access signals", error);
  }

  // Create ticket
  const ticket = await prisma.signupTicket.create({
    data: {
      email,
      ref: ref || null,
      campaignSlug: campaignSlug ?? null,
      clickId: clickId ?? null,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min
    },
  });

  if (clickId) {
    await prisma.campaignReferralAttribution.updateMany({
      where: { clickId, signedUpAt: null },
      data: { signedUpAt: new Date() },
    });
  }

  const confirmUrl = buildAppUrl(`/auth/confirm?ticket=${ticket.id}`, getAppUrlFromRequest(request));

  await sendAuthEmail({
    kind: "verification",
    locale: emailLocale,
    actionUrl: confirmUrl,
    to: email,
  });

  return NextResponse.json({ success: true, ticketId: ticket.id });
}
