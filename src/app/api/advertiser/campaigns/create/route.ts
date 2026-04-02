import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, Platform } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";
import { rateLimit, API_LIMIT, getClientIp } from "@/lib/rate-limit";

const CreateSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "BOTH"]),
  description: z.string().optional(),
  contentGuidelines: z.string().optional(),
  referralLink: z.string().optional(),
  targetCountry: z.string().optional(),
  minEngagementRate: z.string().optional(),
  totalBudget: z.string().min(1),
  cpmUsd: z.string().min(1),
  creatorCpvPerM: z.number(),
  adminMarginPerM: z.number(),
  goalViews: z.number().optional(),
  deadline: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`campaign_create_${ip}`, API_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rlHeaders },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { advertiserProfile: true },
  });

  if (!dbUser?.advertiserProfile) {
    return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
  }

  const totalBudget = parseFloat(data.totalBudget);
  const cpmUsd = parseFloat(data.cpmUsd);

  if (isNaN(totalBudget) || totalBudget < 100) {
    return NextResponse.json({ error: "Budget must be at least $100" }, { status: 400 });
  }
  if (isNaN(cpmUsd) || cpmUsd < 16) {
    return NextResponse.json({ error: "CPM must be at least $16" }, { status: 400 });
  }

  // CPV stored as cost per single view (micro denomination)
  const creatorCpv = data.creatorCpvPerM / 1_000_000;
  const adminMargin = data.adminMarginPerM / 1_000_000;
  const businessCpv = cpmUsd / 1_000_000;

  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      platform: data.platform as Platform,
      description: data.description || null,
      contentGuidelines: data.contentGuidelines || null,
      referralLink: data.referralLink || null,
      targetGeo: data.targetCountry ? [data.targetCountry] : [],
      targetCountry: data.targetCountry || null,
      minEngagementRate: parseFloat(data.minEngagementRate ?? "2") || 2,
      totalBudget,
      creatorCpv,
      adminMargin,
      businessCpv,
      goalViews: data.goalViews ? BigInt(data.goalViews) : null,
      deadline: new Date(data.deadline),
      status: CampaignStatus.draft,
      advertiserId: dbUser.advertiserProfile.id,
    },
  });

  // Create Stripe Checkout Session if Stripe is configured
  if (process.env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ClipProfit Campaign: ${campaign.name}`,
              description: `Budget: $${totalBudget.toLocaleString()} · CPM: $${cpmUsd}`,
            },
            unit_amount: Math.round(totalBudget * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { campaignId: campaign.id },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/advertiser/dashboard?funded=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/advertiser/campaigns/new?cancelled=1`,
    });

    // Store payment session reference
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { stripePaymentId: session.id },
    });

    return NextResponse.json({ campaignId: campaign.id, checkoutUrl: session.url });
  }

  // No Stripe configured — activate immediately (dev mode)
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.active },
  });

  return NextResponse.json({ campaignId: campaign.id, checkoutUrl: null });
}
