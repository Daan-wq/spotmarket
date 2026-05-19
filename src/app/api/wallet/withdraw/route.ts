import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getCreatorPaymentSummary } from "@/lib/creator-payment-summary";

const MIN_WITHDRAWAL_EUR = 20;
const OPEN_PAYOUT_STATUSES = ["pending", "processing"] as const;

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth("creator");
    const body = await request.json().catch(() => ({}));
    const parsedAmount = parseWithdrawalAmount(body?.amount);

    if ("error" in parsedAmount) {
      return NextResponse.json(
        { error: parsedAmount.error },
        { status: 400 },
      );
    }

    const amount = parsedAmount.amount;

    if (amount < MIN_WITHDRAWAL_EUR) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is EUR ${MIN_WITHDRAWAL_EUR}` },
        { status: 400 },
      );
    }

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

    if (summary.availableBalance < MIN_WITHDRAWAL_EUR) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is EUR ${MIN_WITHDRAWAL_EUR}` },
        { status: 400 },
      );
    }

    if (amount > roundToCents(summary.availableBalance)) {
      return NextResponse.json(
        { error: "Withdrawal amount exceeds available balance." },
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

function parseWithdrawalAmount(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { error: "Withdrawal amount is required." };
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Withdrawal amount is required." };
  }
  const rounded = roundToCents(amount);
  if (Math.abs(rounded - amount) > 0.000001) {
    return { error: "Withdrawal amount must use euro cents." };
  }
  return { amount: rounded };
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}
