import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCampaignSchema = z.object({
  // Section 1
  name: z.string().min(1).max(200),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "BOTH"]).optional().default("INSTAGRAM"),
  contentType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  contentGuidelines: z.string().max(5000).optional(),
  requirements: z.string().max(2000).optional(),
  otherNotes: z.string().max(2000).optional(),

  // Section 2
  targetCountry: z.string().length(2).optional(),
  targetCountryPercent: z.number().int().min(0).max(100).optional(),
  targetMinAge18Percent: z.number().int().min(0).max(100).optional(),
  targetMalePercent: z.number().int().min(0).max(100).optional(),
  minEngagementRate: z.number().min(0).max(100).optional().default(0),

  // Section 3 — budget/goals via CPM
  totalBudget: z.number().positive(),
  goalViews: z.number().int().positive().optional(),
  adminMarginPerM: z.number().min(0).optional().default(0),

  // Section 4
  deadline: z.string().datetime(),
  startsAt: z.string().datetime().optional(),
  referralLink: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v), "Referral link must start with https://"),
  bannerUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
  contentAssetUrls: z.array(z.string().url()).optional().default([]),

  // Keep for backwards compat / direct slots config
  briefAssetUrl: z.string().url().optional(),
  maxSlots: z.number().int().positive().optional(),
  requiresApproval: z.boolean().optional().default(false),
  guidelinesUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
});

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: { select: { id: true, totalFollowers: true, engagementRate: true, primaryGeo: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const skip = (page - 1) * limit;

  let where: object = {};

  if (user.role === "creator" && user.creatorProfile) {
    const cp = user.creatorProfile;
    where = {
      status: "active",
      minEngagementRate: { lte: cp.engagementRate },
      targetGeo: { has: cp.primaryGeo },
    };
  }

  if (status) where = { ...where, status };

  const [campaigns, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  // Serialize BigInt fields for JSON
  const serialized = campaigns.map((c) => ({ ...c, goalViews: c.goalViews ? Number(c.goalViews) : null }));

  return NextResponse.json({ campaigns: serialized, total, page, limit });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const d = parsed.data;

  // Compute CPV values from CPM inputs
  const adminMarginCpv = d.adminMarginPerM / 1_000_000;
  const businessCpv = d.goalViews ? d.totalBudget / d.goalViews : adminMarginCpv;
  const creatorCpv = businessCpv - adminMarginCpv;

  if (creatorCpv < 0) {
    return NextResponse.json({ error: "Admin margin is too high — creator CPM would be negative" }, { status: 400 });
  }

  // Derive targetGeo from targetCountry for creator matching
  const targetGeo = d.targetCountry ? [d.targetCountry.toUpperCase()] : [];

  let campaign;
  try {
    campaign = await prisma.campaign.create({
      data: {
        name: d.name,
        platform: d.platform,
        contentType: d.contentType,
        description: d.description,
        contentGuidelines: d.contentGuidelines,
        requirements: d.requirements,
        otherNotes: d.otherNotes,
        referralLink: d.referralLink || null,
        targetGeo,
        minFollowers: 0,
        minEngagementRate: d.minEngagementRate,
        totalBudget: d.totalBudget,
        creatorCpv,
        adminMargin: adminMarginCpv,
        businessCpv,
        goalViews: d.goalViews ? BigInt(d.goalViews) : null,
        deadline: new Date(d.deadline),
        startsAt: d.startsAt ? new Date(d.startsAt) : null,
        briefAssetUrl: d.briefAssetUrl,
        maxSlots: d.maxSlots,
        requiresApproval: d.requiresApproval,
        targetCountry: d.targetCountry,
        targetCountryPercent: d.targetCountryPercent,
        targetMinAge18Percent: d.targetMinAge18Percent,
        targetMalePercent: d.targetMalePercent,
        bannerUrl: d.bannerUrl,
        contentAssetUrls: d.contentAssetUrls,
        guidelinesUrl: d.guidelinesUrl,
      },
    });
  } catch (err) {
    console.error("[POST /api/campaigns]", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const payload = JSON.parse(
    JSON.stringify(campaign, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
  );
  return NextResponse.json(payload, { status: 201 });
}
