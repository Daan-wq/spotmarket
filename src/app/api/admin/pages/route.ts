import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  handle: z.string().min(1),
  niche: z.string().optional(),
  followerCount: z.number().int().min(0).default(0),
  avgEngagementRate: z.number().min(0).default(0),
  avgCpm: z.number().min(0).default(0),
  reliabilityScore: z.number().int().min(1).max(10).default(5),
  communicationChannel: z.enum(["instagram", "whatsapp", "telegram", "email"]).default("instagram"),
  communicationHandle: z.string().optional(),
  contactName: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth("admin");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const niche = searchParams.get("niche") ?? "";

  const pages = await prisma.instagramPage.findMany({
    where: {
      status: "active",
      ...(search ? { handle: { contains: search, mode: "insensitive" } } : {}),
      ...(niche ? { niche: { contains: niche, mode: "insensitive" } } : {}),
    },
    include: {
      _count: { select: { internalCampaignPages: true } },
    },
    orderBy: { followerCount: "desc" },
  });

  return NextResponse.json(pages);
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

  const page = await prisma.instagramPage.create({ data: parsed.data });
  return NextResponse.json(page, { status: 201 });
}
