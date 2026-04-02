import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];

const launchCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  platform: z.enum(["INSTAGRAM", "TIKTOK", "BOTH"]).optional().default("INSTAGRAM"),
  contentType: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  contentGuidelines: z.string().max(5000).optional(),
  requirements: z.string().max(2000).optional(),
  otherNotes: z.string().max(2000).optional(),

  // New fields
  bannerVideoUrl: z.string().url().optional().or(z.literal("")),
  linkInBioRequired: z.string().url().optional().or(z.literal("")),
  bioRequirement: z.string().max(500).optional(),
  niche: z.enum(["FINANCE","TECH","MOTIVATION","FOOD","HUMOR","LIFESTYLE","CASINO"]).optional(),
  minFollowers: z.number().int().min(0).optional().default(0),
  ownerWalletAddress: z.string().optional(),
  depositTxHash: z.string().optional(),

  targetCountry: z.string().refine((v) => GEO_OPTIONS.includes(v), "Invalid target country").optional(),
  targetCountryPercent: z.number().int().min(0).max(100).optional(),
  targetMinAge18Percent: z.number().int().min(0).max(100).optional(),
  targetMalePercent: z.number().int().min(0).max(100).optional(),
  minEngagementRate: z.number().min(0).max(100).optional().default(0),

  totalBudget: z.number().positive("Budget must be greater than 0"),
  cpmUsd: z.number().positive("CPM must be greater than 0").optional(),
  goalViews: z.number().int().positive().optional(),

  deadline: z.string().datetime(),
  referralLink: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v), "Referral link must start with https://"),
  bannerUrl: z.string().optional().refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: { select: { id: true, tronsAddress: true, displayName: true } },
      followers: { select: { followerId: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const parsed = launchCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const d = parsed.data;
  const targetGeo = d.targetCountry ? [d.targetCountry.toUpperCase()] : [];
  const ownerWalletAddress = d.ownerWalletAddress || user.creatorProfile?.tronsAddress || null;

  // CPV calculation: platform keeps 10%, creators get 90%
  const adminMargin = d.cpmUsd ? 0.10 : 0;
  const businessCpv = d.cpmUsd ? d.cpmUsd / 1_000_000 : 0;
  const creatorCpv = businessCpv * (1 - adminMargin);
  const goalViews = d.goalViews
    ? BigInt(d.goalViews)
    : businessCpv > 0
    ? BigInt(Math.floor(d.totalBudget / businessCpv))
    : null;

  const campaign = await prisma.campaign.create({
    data: {
      name: d.name,
      platform: d.platform,
      contentType: d.contentType,
      description: d.description,
      contentGuidelines: d.contentGuidelines,
      requirements: d.requirements,
      otherNotes: d.otherNotes,
      referralLink: d.referralLink || null,
      bannerVideoUrl: d.bannerVideoUrl || null,
      linkInBioRequired: d.linkInBioRequired || null,
      bioRequirement: d.bioRequirement || null,
      niche: d.niche,
      targetGeo,
      targetCountry: d.targetCountry,
      targetCountryPercent: d.targetCountryPercent,
      targetMinAge18Percent: d.targetMinAge18Percent,
      targetMalePercent: d.targetMalePercent,
      minFollowers: d.minFollowers,
      minEngagementRate: d.minEngagementRate,
      totalBudget: d.totalBudget,
      creatorCpv,
      adminMargin,
      businessCpv,
      goalViews,
      deadline: new Date(d.deadline),
      bannerUrl: d.bannerUrl,
      status: "pending_review",
      createdByUserId: user.id,
      ownerWalletAddress,
      depositTxHash: d.depositTxHash || null,
    },
  });

  // Notify followers
  const launcherName = user.creatorProfile?.displayName ?? user.email;
  if (user.followers.length > 0) {
    await Promise.all(
      user.followers.map(({ followerId }) =>
        createNotification(followerId, "CAMPAIGN_LAUNCHED", {
          campaignId: campaign.id,
          campaignName: campaign.name,
          launcherName,
          launcherUserId: user.id,
        })
      )
    );
  }

  const adminWallet = process.env.ADMIN_TRON_WALLET ?? null;

  const payload = JSON.parse(
    JSON.stringify(campaign, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
  );

  return NextResponse.json({
    ...payload,
    adminWalletAddress: adminWallet,
    requiredUsdt: d.totalBudget,
  }, { status: 201 });
}
