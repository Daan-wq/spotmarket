import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { Niche } from "@prisma/client";

const NICHES = Object.values(Niche) as [Niche, ...Niche[]];

const updateSchema = z.object({
  handle: z.string().min(1).optional(),
  niche: z.enum(NICHES).optional(),
  followerCount: z.number().int().min(0).optional(),
  avgEngagementRate: z.number().min(0).optional(),
  avgCpm: z.number().min(0).optional(),
  reliabilityScore: z.number().int().min(1).max(10).optional(),
  communicationChannel: z.enum(["instagram", "whatsapp", "telegram", "email"]).optional(),
  communicationHandle: z.string().optional(),
  contactName: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive", "paused"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const page = await prisma.instagramPage.findUnique({
    where: { id },
    include: {
      internalCampaignPages: {
        include: { internalCampaign: { select: { name: true, status: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const page = await prisma.instagramPage.update({ where: { id }, data: parsed.data });
  return NextResponse.json(page);
}
