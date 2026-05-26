import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { Niche } from "@prisma/client";
import { z } from "zod";
import { ensureDiscordCampaignProvisioning } from "@/lib/discord-campaign-provisioning";
import { sendCampaignAnnouncementOnce } from "@/lib/admin/discord-campaign-announcements";

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
  bannerVideoUrl: z.string().optional(),
  briefAssetUrl: z.string().optional(),
  guidelinesUrl: z.string().optional(),
  requiredHashtags: z.array(z.string()).optional(),
  referralLink: z.string().optional(),
  linkInBioRequired: z.string().optional(),
  bioRequirement: z.string().optional(),
  contentType: z.string().optional(),
  requirements: z.string().optional(),
  targetCountry: z.string().optional(),
  targetCountryPercent: z.number().int().min(0).max(100).optional(),
  targetMinAge18Percent: z.number().int().min(0).max(100).optional(),
  targetMalePercent: z.number().int().min(0).max(100).optional(),
  minEngagementRate: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("admin");

    const body = await req.json();
    const data = launchCampaignSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
        targetGeo: data.targetGeo || (data.targetCountry ? [data.targetCountry.toUpperCase()] : []),
        minFollowers: data.minFollowers,
        minEngagementRate: data.minEngagementRate,
        niche: (data.niche || "FINANCE") as Niche,
        contentAssetUrls: data.contentAssetUrls || [],
        bannerVideoUrl: data.bannerVideoUrl,
        briefAssetUrl: data.briefAssetUrl,
        guidelinesUrl: data.guidelinesUrl,
        requiredHashtags: data.requiredHashtags || [],
        referralLink: data.referralLink,
        linkInBioRequired: data.linkInBioRequired,
        bioRequirement: data.bioRequirement,
        contentType: data.contentType,
        requirements: data.requirements,
        targetCountry: data.targetCountry,
        targetCountryPercent: data.targetCountryPercent,
        targetMinAge18Percent: data.targetMinAge18Percent,
        targetMalePercent: data.targetMalePercent,
        createdByUserId: user.id,
        status: "draft",
      },
    });

    const provisioned = await ensureDiscordCampaignProvisioning(campaign);
    const activeCampaign = await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "active" },
    });

    try {
      const discordAnnouncement = await sendCampaignAnnouncementOnce({
        campaign: activeCampaign,
        userId: user.id,
      });

      return NextResponse.json(
        { campaign: activeCampaign, discordProvisioning: provisioned.resources, discordAnnouncement },
        { status: 201 },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Discord announcement failed";
      return NextResponse.json(
        {
          campaign: activeCampaign,
          discordProvisioning: provisioned.resources,
          discordAnnouncement: { status: "failed", error: message },
          error: message,
        },
        { status: 502 },
      );
    }
  } catch (err: unknown) {
    console.error("[campaigns launch]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
