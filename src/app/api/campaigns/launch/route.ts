import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const launchCampaignSchema = z.object({
  name: z.string().min(3),
  totalBudget: z.number().positive(),
  creatorCpv: z.number().positive(),
  deadline: z.string(),
  description: z.string().optional(),
  contentGuidelines: z.string().optional(),
  targetGeo: z.array(z.string()).optional(),
  minFollowers: z.number().default(0),
  niche: z.string().optional(),
  contentAssetUrls: z.array(z.string()).optional(),
  referralLink: z.string().optional(),
  linkInBioRequired: z.string().optional(),
  bioRequirement: z.string().optional(),
  contentType: z.string().optional(),
  requirements: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("advertiser");

    const body = await req.json();
    const data = launchCampaignSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { advertiserProfile: true },
    });

    if (!user?.advertiserProfile) {
      return NextResponse.json({ error: "Advertiser profile not found" }, { status: 404 });
    }

    const adminMargin = data.creatorCpv * 0.3;
    const businessCpv = data.creatorCpv + adminMargin;

    const campaign = await prisma.campaign.create({
      data: {
        name: data.name,
        totalBudget: data.totalBudget,
        creatorCpv: data.creatorCpv,
        adminMargin,
        businessCpv,
        deadline: new Date(data.deadline),
        description: data.description,
        contentGuidelines: data.contentGuidelines,
        targetGeo: data.targetGeo || [],
        minFollowers: data.minFollowers,
        niche: (data.niche || "FINANCE") as any,
        contentAssetUrls: data.contentAssetUrls || [],
        referralLink: data.referralLink,
        linkInBioRequired: data.linkInBioRequired,
        bioRequirement: data.bioRequirement,
        contentType: data.contentType,
        requirements: data.requirements,
        advertiserId: user.advertiserProfile.id,
        createdByUserId: user.id,
        status: "active",
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err: any) {
    console.error("[campaigns launch]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
