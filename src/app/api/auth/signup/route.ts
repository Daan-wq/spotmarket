import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAppUrl, getAppUrlFromRequest, getLocaleFromRequest } from "@/lib/app-url";
import { getAuthEmailLocale, sendAuthEmail } from "@/lib/auth-email";
import { normalizeCampaignSlug } from "@/lib/campaign-referrals";
import { getTranslations } from "next-intl/server";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
  campaign: z.string().optional(),
  click: z.string().optional(),
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
  const { error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
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
