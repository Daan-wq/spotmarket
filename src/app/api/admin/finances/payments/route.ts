import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  direction: z.enum(["in", "out"]),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  clientId: z.string().optional(),
  pageId: z.string().optional(),
  internalCampaignId: z.string().optional(),
  paymentNetworkId: z.string().optional(),
  status: z.enum(["pending", "processing", "sent", "confirmed", "failed"]).default("pending"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const direction = searchParams.get("direction") ?? "";
  const status = searchParams.get("status") ?? "";

  const payments = await prisma.opsPayment.findMany({
    where: {
      ...(direction ? { direction } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      client: { select: { name: true } },
      page: { select: { handle: true } },
      internalCampaign: { select: { name: true } },
      paymentNetwork: { select: { platform: true, accountLabel: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { dueDate, ...data } = parsed.data;
  const payment = await prisma.opsPayment.create({
    data: {
      ...data,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  // Update client totalSpent if direction is "in"
  if (payment.clientId && payment.direction === "in") {
    await prisma.client.update({
      where: { id: payment.clientId },
      data: { totalSpent: { increment: payment.amount } },
    });
  }

  return NextResponse.json(payment, { status: 201 });
}
