import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { formatIban, isValidIban, normalizeIban } from "@/lib/validation/iban";

const payoutAddressSchema = z.object({
  iban: z.string().trim().refine(isValidIban, "Enter a valid IBAN."),
  accountName: z.string().trim().min(2, "Account holder name is required."),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { iban, accountName } = payoutAddressSchema.parse(body);
    const payoutIban = normalizeIban(iban);
    const payoutAccountName = accountName.replace(/\s+/g, " ").trim();

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
      data: { payoutIban, payoutAccountName },
    });

    return NextResponse.json({
      payoutIban,
      payoutAccountName,
      iban: formatIban(payoutIban),
      accountName: payoutAccountName,
    });
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
