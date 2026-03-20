import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  platform: z.string().min(1),
  accountLabel: z.string().min(1),
  currency: z.string().default("USD"),
  balance: z.number().default(0),
});

export async function GET() {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const networks = await prisma.paymentNetwork.findMany({
    include: { _count: { select: { payments: true } } },
    orderBy: { platform: "asc" },
  });

  return NextResponse.json(networks);
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

  const network = await prisma.paymentNetwork.create({ data: parsed.data });
  return NextResponse.json(network, { status: 201 });
}
