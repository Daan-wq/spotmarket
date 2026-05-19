import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

const MIN_WITHDRAWAL_EUR = 20;
const OPEN_PAYOUT_STATUSES = ["pending", "processing"] as const;

export async function POST() {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: {
        id: true,
        creatorProfile: {
          select: {
            id: true,
            payoutIban: true,
            payoutAccountName: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const { id: creatorProfileId, payoutIban, payoutAccountName } = user.creatorProfile;
    if (!payoutIban || !payoutAccountName) {
      return NextResponse.json(
        { error: "Add your IBAN and account holder name before requesting a payout." },
        { status: 400 },
      );
    }

    const existingOpenRequest = await prisma.payout.findFirst({
      where: {
        creatorProfileId,
        status: { in: [...OPEN_PAYOUT_STATUSES] },
      },
      select: { id: true },
    });

    if (existingOpenRequest) {
      return NextResponse.json(
        { error: "You already have a payout request in progress." },
        { status: 400 },
      );
    }

    const summary = await getCreatorPaymentSummary(user.id, creatorProfileId);
    const amount = summary.availableBalance;

    if (amount < MIN_WITHDRAWAL_EUR) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is EUR ${MIN_WITHDRAWAL_EUR}` },
        { status: 400 },
      );
    }

    const now = new Date();
    const payout = await prisma.payout.create({
      data: {
        creatorProfileId,
        amount,
        currency: "EUR",
        status: "pending",
        type: "final",
        paymentMethod: "BANK_TRANSFER",
        bankIbanSnapshot: payoutIban,
        bankAccountNameSnapshot: payoutAccountName,
        requestedAt: now,
        applicationIds: [],
      },
    });

    return NextResponse.json(
      {
        withdrawal: {
          id: payout.id,
          amount: Number(payout.amount),
          status: payout.status,
          currency: payout.currency,
          paymentMethod: payout.paymentMethod,
          bankIban: payout.bankIbanSnapshot,
          bankAccountName: payout.bankAccountNameSnapshot,
          requestedAt: payout.requestedAt,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[wallet withdraw]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
