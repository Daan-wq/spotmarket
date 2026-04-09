import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/auth";
import { postCampaignAnnouncement } from "@/lib/discord";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      totalBudget: true,
      otherNotes: true,
      platform: true,
      platforms: true,
      contentType: true,
      requirements: true,
      minAge: true,
      pageStats: true,
      niche: true,
      targetCountry: true,
      contentGuidelines: true,
    },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Map niche enum values to display labels
  const NICHE_LABELS: Record<string, string> = {
    MEMES: "Memes", SPORT: "Sport", CLIPS: "Clips",
    GAMING: "Gaming", LIFESTYLE: "Lifestyle", FINANCE: "Finance", OTHER: "Other",
  };

  // Map country codes to names for Discord display
  const COUNTRY_NAMES: Record<string, string> = {
    US: "United States", GB: "United Kingdom", NL: "Netherlands", BE: "Belgium",
    DE: "Germany", GR: "Greece", AU: "Australia", CA: "Canada", SE: "Sweden",
    NO: "Norway", FI: "Finland", DK: "Denmark", AT: "Austria", CH: "Switzerland",
    ES: "Spain", FR: "France", IT: "Italy", PT: "Portugal", PL: "Poland",
    CZ: "Czech Republic", HU: "Hungary", RO: "Romania", BG: "Bulgaria",
    HR: "Croatia", SK: "Slovakia", SI: "Slovenia", EE: "Estonia", LV: "Latvia",
    LT: "Lithuania", MT: "Malta", CY: "Cyprus", LU: "Luxembourg", IE: "Ireland",
    BR: "Brazil", IN: "India", ID: "Indonesia", JP: "Japan", MX: "Mexico", TR: "Turkey",
  };

  // Use contentType from create form, fall back to niche from edit form
  const contentType = campaign.contentType
    || (campaign.niche
      ? campaign.niche.split(", ").map(n => NICHE_LABELS[n] ?? n).join(" · ")
      : null);

  // Use otherNotes (countries) from create form, fall back to targetCountry from edit form
  const regions = campaign.otherNotes
    || (campaign.targetCountry ? COUNTRY_NAMES[campaign.targetCountry] ?? campaign.targetCountry : null);

  await postCampaignAnnouncement({
    name: campaign.name,
    totalBudget: Number(campaign.totalBudget),
    otherNotes: regions,
    platform: campaign.platform,
    platforms: campaign.platforms,
    contentType,
    requirements: campaign.requirements,
    minAge: campaign.minAge,
    pageStats: campaign.pageStats,
  });

  return NextResponse.json({ success: true });
}
