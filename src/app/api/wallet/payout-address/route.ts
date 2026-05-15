import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { TRON_REGEX } from "@/lib/validation/tron";

const payoutAddressSchema = z.object({
  tronsAddress: z
    .string()
    .trim()
    .regex(
      TRON_REGEX,
      "Address must start with capital T and be 34 characters (TRC-20 format).",
    ),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { tronsAddress } = payoutAddressSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true, creatorProfile: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.creatorProfile) {
      return NextResponse.json(
        { error: "Creator profile not found" },
        { status: 404 },
      );
    }

    await prisma.creatorProfile.update({
      where: { userId: user.id },
      data: { tronsAddress },
    });

    return NextResponse.json({ tronsAddress });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input", details: err.issues },
        { status: 400 },
      );
    }
    console.error("[wallet payout-address]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
