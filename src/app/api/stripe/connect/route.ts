import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { rateLimit, PAYMENT_LIMIT, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`stripe_connect_${ip}`, PAYMENT_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rlHeaders },
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: true,
    },
  });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profile = dbUser.creatorProfile;
  if (!profile) return NextResponse.json({ error: "No creator profile found" }, { status: 400 });

  let stripeAccountId = profile.stripeAccountId;

  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dbUser.email,
      capabilities: { transfers: { requested: true } },
    });
    stripeAccountId = account.id;

    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { stripeAccountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creator/settings?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
