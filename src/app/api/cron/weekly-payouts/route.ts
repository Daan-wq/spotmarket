import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_PAYOUT_CENTS = 1000; // €10

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thisMonday = new Date();
  const dayOfWeek = thisMonday.getDay();
  const diff = (dayOfWeek + 6) % 7;
  thisMonday.setDate(thisMonday.getDate() - diff);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);

  const applications = await prisma.campaignApplication.findMany({
    where: { earnedAmount: { gt: 0 } },
    include: {
      creatorProfile: { select: { id: true, walletAddress: true, stripeAccountId: true } },
      network: { select: { id: true, walletAddress: true, stripeAccountId: true } },
    },
  });

  const unpaid = applications.filter((a) => a.earnedAmount - a.paidAmount > 0);

  const byCreator = new Map<string, typeof unpaid>();
  const byNetwork = new Map<string, typeof unpaid>();

  for (const app of unpaid) {
    if (app.creatorProfileId && app.creatorProfile) {
      const key = app.creatorProfileId;
      byCreator.set(key, [...(byCreator.get(key) ?? []), app]);
    } else if (app.networkId && app.network) {
      const key = app.networkId;
      byNetwork.set(key, [...(byNetwork.get(key) ?? []), app]);
    }
  }

  let payoutsCreated = 0;

  for (const [creatorProfileId, apps] of byCreator) {
    const totalUnpaid = apps.reduce((s, a) => s + (a.earnedAmount - a.paidAmount), 0);
    if (totalUnpaid < MIN_PAYOUT_CENTS) continue;

    const creator = apps[0].creatorProfile!;
    await prisma.payout.create({
      data: {
        creatorProfileId,
        amount: totalUnpaid / 100,
        currency: "EUR",
        status: "pending",
        type: "final",
        walletAddress: creator.walletAddress ?? undefined,
        paymentMethod: creator.stripeAccountId ? "STRIPE" : (creator.walletAddress ? "CRYPTO" : undefined),
        applicationIds: apps.map((a) => a.id),
        periodStart: lastMonday,
        periodEnd: thisMonday,
      },
    });
    payoutsCreated++;
  }

  for (const [networkId, apps] of byNetwork) {
    const totalUnpaid = apps.reduce((s, a) => s + (a.earnedAmount - a.paidAmount), 0);
    if (totalUnpaid < MIN_PAYOUT_CENTS) continue;

    const network = apps[0].network!;
    await prisma.payout.create({
      data: {
        networkId,
        amount: totalUnpaid / 100,
        currency: "EUR",
        status: "pending",
        type: "final",
        walletAddress: network.walletAddress ?? undefined,
        paymentMethod: network.stripeAccountId ? "STRIPE" : (network.walletAddress ? "CRYPTO" : undefined),
        applicationIds: apps.map((a) => a.id),
        periodStart: lastMonday,
        periodEnd: thisMonday,
      },
    });
    payoutsCreated++;
  }

  return NextResponse.json({ ok: true, payoutsCreated });
}
