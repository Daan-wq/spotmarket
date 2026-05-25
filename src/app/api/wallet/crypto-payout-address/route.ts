import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  isValidSolanaAddress,
  maskSolanaAddress,
  normalizeSolanaAddress,
} from "@/lib/validation/solana";

const cryptoPayoutAddressSchema = z.object({
  solanaAddress: z
    .string()
    .trim()
    .refine(isValidSolanaAddress, "Enter a valid Solana wallet address."),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { solanaAddress } = cryptoPayoutAddressSchema.parse(body);
    const payoutSolanaAddress = normalizeSolanaAddress(solanaAddress);

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
      data: { payoutSolanaAddress },
    });

    return NextResponse.json({
      payoutSolanaAddress,
      solanaAddress: maskSolanaAddress(payoutSolanaAddress),
      network: "SOLANA",
      token: "USDC",
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input", details: err.issues },
        { status: 400 },
      );
    }
    console.error("[wallet crypto-payout-address]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
