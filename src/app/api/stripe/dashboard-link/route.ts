import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });

  const profile = dbUser?.creatorProfile;
  if (!profile?.stripeAccountId) {
    return NextResponse.json({ error: "No Stripe account connected" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-02-25.clover" });
  const loginLink = await stripe.accounts.createLoginLink(profile.stripeAccountId);

  return NextResponse.json({ url: loginLink.url });
}
