import { prisma } from "@/lib/prisma";
import { computeDemographicStats } from "@/lib/instagram";
import type { IgDemographics } from "@/types/instagram";

export async function updateCreatorAggregateStats(creatorProfileId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { creatorProfileId, isActive: true, platform: "instagram" },
  });

  if (accounts.length === 0) {
    await prisma.creatorProfile.update({
      where: { id: creatorProfileId },
      data: {
        totalFollowers: 0,
        topCountry: null,
        topCountryPercent: null,
        malePercent: null,
        age18PlusPercent: null,
      },
    });
    return;
  }

  // Find the best account by engagement rate
  const best = accounts.reduce((a, b) =>
    Number(b.engagementRate) > Number(a.engagementRate) ? b : a
  );

  const stats = computeDemographicStats(best.igDemographics as IgDemographics | null);

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: {
      totalFollowers: accounts.reduce((s, a) => s + a.followerCount, 0),
      topCountry: stats.topCountry ?? null,
      topCountryPercent: stats.topCountryPercent ?? null,
      malePercent: stats.malePercent ?? null,
      age18PlusPercent: stats.age18PlusPercent ?? null,
    },
  });
}
