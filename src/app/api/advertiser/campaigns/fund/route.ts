import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";
import Stripe from "stripe";
import { notifyCampaignLive } from "@/lib/discord";
import { rateLimit, PAYMENT_LIMIT, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`payment_${ip}`, PAYMENT_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rlHeaders },
    );
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const campaignId = session.metadata?.campaignId;

    if (!campaignId) return NextResponse.json({ received: true });

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.active },
      include: { advertiser: true },
    });

    // Fire Discord webhook to #deals channel
    await notifyCampaignLive({
      id: campaign.id,
      name: campaign.name,
      platform: campaign.platform,
      totalBudget: Number(campaign.totalBudget),
      businessCpv: Number(campaign.businessCpv),
      targetCountry: campaign.targetCountry,
      minEngagementRate: Number(campaign.minEngagementRate),
      advertiserBrandName: campaign.advertiser?.brandName ?? null,
    });
  }

  return NextResponse.json({ received: true });
}
