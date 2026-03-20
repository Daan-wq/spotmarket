import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  clientPays: z.number().positive(),
  adContentUrl: z.string().optional(),
  adCaption: z.string().optional(),
  adLink: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  pages: z.array(z.object({
    pageId: z.string(),
    cost: z.number().positive(),
  })).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";

  const campaigns = await prisma.internalCampaign.findMany({
    where: status ? { status } : {},
    include: {
      client: { select: { name: true, communicationChannel: true, communicationHandle: true } },
      campaignPages: {
        include: { page: { select: { handle: true, followerCount: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campaigns);
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

  const { pages, startDate, endDate, ...data } = parsed.data;
  const totalPageCost = (pages ?? []).reduce((sum, p) => sum + p.cost, 0);

  const campaign = await prisma.internalCampaign.create({
    data: {
      ...data,
      totalPageCost,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      campaignPages: pages
        ? { create: pages.map((p) => ({ pageId: p.pageId, cost: p.cost })) }
        : undefined,
    },
    include: { campaignPages: true },
  });

  return NextResponse.json(campaign, { status: 201 });
}
