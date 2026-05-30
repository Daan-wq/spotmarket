import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildAppUrl, getAppUrlFromRequest, getLocaleFromRequest } from "@/lib/app-url";
import { normalizeCampaignSlug } from "@/lib/campaign-referrals";
import { Resend } from "resend";
import { getTranslations } from "next-intl/server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  ref: z.string().optional(),
  campaign: z.string().optional(),
  click: z.string().optional(),
});

export async function POST(request: Request) {
  const locale = getLocaleFromRequest(request);
  const t = await getTranslations({ locale, namespace: "auth.api" });
  const emailT = await getTranslations({ locale, namespace: "auth.email" });
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
  const { data: userData, error: createError } =
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

  // Send verification email via Resend
  const confirmUrl = buildAppUrl(`/auth/confirm?ticket=${ticket.id}`, getAppUrlFromRequest(request));

  await getResend().emails.send({
    from: "ClipProfit <noreply@clipprofit.com>",
    to: email,
    subject: emailT("subject"),
    html: renderSignupVerificationEmail({
      title: emailT("title"),
      body: emailT("body"),
      button: emailT("button"),
      footer: emailT("footer"),
      confirmUrl,
    }),
  });

  return NextResponse.json({ success: true, ticketId: ticket.id });
}

function renderSignupVerificationEmail({
  title,
  body,
  button,
  footer,
  confirmUrl,
}: {
  title: string;
  body: string;
  button: string;
  footer: string;
  confirmUrl: string;
}) {
  return `
    <div style="background:#f7f9f9;margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="margin-bottom:18px;color:#010405;font-size:20px;font-weight:900;font-style:italic;line-height:1;text-transform:uppercase;">ClipProfit</div>
        <div style="background:#fbfcfc;border:1px solid #d2d9db;border-radius:24px;padding:32px;box-shadow:0 2px 8px rgba(23,33,54,0.08),0 18px 48px rgba(23,33,54,0.08);">
          <div style="width:56px;height:6px;border-radius:999px;background:#5d5fef;margin-bottom:22px;"></div>
          <h2 style="color:#010405;font-size:28px;line-height:1.08;font-weight:800;margin:0 0 18px;">${title}</h2>
          <p style="color:#5a6569;font-size:15px;line-height:1.65;margin:0 0 18px;">${body}</p>
          <a href="${confirmUrl}" style="display:inline-block;background-color:#5d5fef;background:linear-gradient(135deg,#5d5fef,#3f41b3);color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-size:14px;font-weight:700;margin-top:8px;box-shadow:0 12px 26px rgba(93,95,239,0.24);">${button}</a>
        </div>
        <p style="color:#5a6569;font-size:12px;line-height:1.6;margin:22px 8px 0;">${footer}</p>
      </div>
    </div>
  `;
}
