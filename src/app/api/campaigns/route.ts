import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  contentGuidelines: z.string().max(5000).optional(),
  referralLink: z.string().url("Must be a valid URL"),
  targetGeo: z.array(z.string().length(2)).min(1, "At least one geo required"),
  minFollowers: z.number().int().min(0),
  minEngagementRate: z.number().min(0).max(100),
  totalBudget: z.number().positive(),
  creatorCpv: z.number().positive(),
  adminMargin: z.number().min(0),
  deadline: z.string().datetime(),
  briefAssetUrl: z.string().url().optional(),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: { select: { id: true, totalFollowers: true, engagementRate: true, primaryGeo: true } },
      businessProfile: { select: { id: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const skip = (page - 1) * limit;

  let where: object = {};

  if (user.role === "business" && user.businessProfile) {
    where = { businessProfileId: user.businessProfile.id };
  } else if (user.role === "creator" && user.creatorProfile) {
    const cp = user.creatorProfile;
    where = {
      status: "active",
      minFollowers: { lte: cp.totalFollowers },
      minEngagementRate: { lte: cp.engagementRate },
      targetGeo: { has: cp.primaryGeo },
    };
  }

  if (status) where = { ...where, status };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        businessProfile: { select: { companyName: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  return NextResponse.json({ campaigns, total, page, limit });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { businessProfile: { select: { id: true } } },
  });

  if (!user || (user.role !== "admin" && user.role !== "business")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!user.businessProfile) {
    return NextResponse.json({ error: "Business profile required" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const d = parsed.data;
  const campaign = await prisma.campaign.create({
    data: {
      businessProfileId: user.businessProfile.id,
      name: d.name,
      description: d.description,
      contentGuidelines: d.contentGuidelines,
      referralLink: d.referralLink,
      targetGeo: d.targetGeo.map((g) => g.toUpperCase()),
      minFollowers: d.minFollowers,
      minEngagementRate: d.minEngagementRate,
      totalBudget: d.totalBudget,
      creatorCpv: d.creatorCpv,
      adminMargin: d.adminMargin,
      businessCpv: d.creatorCpv + d.adminMargin,
      deadline: new Date(d.deadline),
      briefAssetUrl: d.briefAssetUrl,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
