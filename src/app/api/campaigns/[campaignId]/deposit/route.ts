import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, PAYMENT_LIMIT, getClientIp } from "@/lib/rate-limit";

// Tron transaction hashes are 64-char hex strings
const TRON_TX_REGEX = /^[0-9a-fA-F]{64}$/;

const depositSchema = z.object({
  txHash: z.string().refine((v) => TRON_TX_REGEX.test(v), "Invalid Tron transaction hash — must be 64 hex characters"),
});

export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const ip = getClientIp(req);
  const { success, headers: rlHeaders } = rateLimit(`deposit_${ip}`, PAYMENT_LIMIT);
  if (!success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: rlHeaders },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true, createdByUserId: true },
  });

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Only the campaign owner (or admin) can submit tx hash
  if (campaign.createdByUserId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (campaign.status !== "pending_payment") {
    return NextResponse.json({ error: "Campaign is not awaiting payment" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      depositTxHash: parsed.data.txHash,
      status: "pending_review",
    },
    select: { id: true, status: true, depositTxHash: true },
  });

  return NextResponse.json(updated);
}
