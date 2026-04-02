"use server";

import { prisma } from "@/lib/prisma";
import { Niche, ScoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface ScoutedPageFormData {
  instagramHandle: string;
  niche: Niche;
  followerCount: number;
  engagementRate: number;
  monthlyGrowthPct: number;
  contentFreqPerWeek: number;
  authenticityScore: number;
  notes?: string;
}

/**
 * Compute weighted score (0–100) from scorecard inputs.
 * Weights from research: engagement 30%, growth 25%, niche 20%, content 15%, authenticity 10%
 */
function computeScore(data: ScoutedPageFormData): number {
  const NICHE_MONETIZATION: Record<Niche, number> = {
    FINANCE: 100,
    TECH: 90,
    MOTIVATION: 70,
    FOOD: 65,
    HUMOR: 60,
    LIFESTYLE: 55,
    CASINO: 40,
  };

  // Engagement: 5%+ = 100pts, 1% = 20pts (linear scale, capped at 100)
  const engScore = Math.min((data.engagementRate / 5) * 100, 100);

  // Growth: 10%+/month = 100pts, 0% = 0pts
  const growthScore = Math.min((data.monthlyGrowthPct / 10) * 100, 100);

  // Niche monetization: lookup table
  const nicheScore = NICHE_MONETIZATION[data.niche];

  // Content frequency: 7/week = 100pts, daily TikTok / 3-4x IG
  const contentScore = Math.min((data.contentFreqPerWeek / 7) * 100, 100);

  // Authenticity: direct 0–100
  const authScore = Math.min(data.authenticityScore, 100);

  return (
    engScore * 0.3 +
    growthScore * 0.25 +
    nicheScore * 0.2 +
    contentScore * 0.15 +
    authScore * 0.1
  );
}

export async function createScoutedPage(data: ScoutedPageFormData) {
  const totalScore = computeScore(data);
  await prisma.scoutedPage.create({
    data: {
      instagramHandle: data.instagramHandle,
      niche: data.niche,
      followerCount: data.followerCount,
      engagementRate: data.engagementRate,
      monthlyGrowthPct: data.monthlyGrowthPct,
      contentFreqPerWeek: data.contentFreqPerWeek,
      authenticityScore: data.authenticityScore,
      totalScore,
      notes: data.notes,
      status: "IDENTIFIED",
    },
  });
  revalidatePath("/admin/scouting");
}

export async function updateScoutStatus(id: string, status: ScoutStatus) {
  const update: Record<string, unknown> = { status };
  if (status === "CONTACTED") update.contactedAt = new Date();
  if (status === "SIGNED") update.signedAt = new Date();
  await prisma.scoutedPage.update({ where: { id }, data: update });
  revalidatePath("/admin/scouting");
}

export async function rejectScoutedPage(id: string, reason: string) {
  await prisma.scoutedPage.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
  });
  revalidatePath("/admin/scouting");
}
