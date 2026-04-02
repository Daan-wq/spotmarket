import { prisma } from "@/lib/prisma";
import { Niche } from "@prisma/client";

export interface AgencyMetrics {
  // Talent Utilization Rate
  talentUtilizationRate: number; // % pages with active deal
  totalPages: number;
  pagesWithActiveDeal: number;

  // Deal pipeline
  totalDeals: number;
  dealsPitched: number;
  dealsCompleted: number;
  bookingToSubmissionRatio: number; // completed / pitched

  // Revenue
  totalAgencyRevenue: number; // from completed deals
  avgDealSize: number;
  revenueByNiche: { niche: Niche; revenue: number; count: number }[];

  // Content backlog
  avgContentBacklogDays: number;
  pagesWithLowBacklog: number; // < 14 days

  // Operator replaceability
  operatorReplaceabilityScore: number; // % pages with replacementReady = true

  // Contract health
  signedContractRate: number; // % pages with SIGNED contract

  // Tier distribution
  tierCounts: { tier: string; count: number }[];
}

export async function getAgencyMetrics(): Promise<AgencyMetrics> {
  const [pages, deals] = await Promise.all([
    prisma.instagramPage.findMany({
      select: {
        tierLevel: true,
        contractStatus: true,
        contentBacklogDays: true,
        replacementReady: true,
        _count: { select: { brandDeals: true } },
      },
    }),
    prisma.brandDeal.findMany({
      select: {
        status: true,
        niche: true,
        totalValue: true,
        agencyCommission: true,
        pitchedAt: true,
        signedAt: true,
      },
    }),
  ]);

  const totalPages = pages.length;
  const pagesWithActiveDeal = pages.filter((p) => p._count.brandDeals > 0).length;
  const talentUtilizationRate = totalPages > 0 ? (pagesWithActiveDeal / totalPages) * 100 : 0;

  const totalDeals = deals.length;
  const dealsPitched = deals.filter((d) => d.pitchedAt !== null).length;
  const dealsCompleted = deals.filter((d) => d.status === "COMPLETED").length;
  const bookingToSubmissionRatio = dealsPitched > 0 ? (dealsCompleted / dealsPitched) * 100 : 0;

  const completedDeals = deals.filter((d) => d.status === "COMPLETED" && d.agencyCommission);
  const totalAgencyRevenue = completedDeals.reduce((s, d) => s + (d.agencyCommission ?? 0), 0);
  const completedWithValue = deals.filter((d) => d.status === "COMPLETED" && d.totalValue);
  const avgDealSize =
    completedWithValue.length > 0
      ? completedWithValue.reduce((s, d) => s + (d.totalValue ?? 0), 0) / completedWithValue.length
      : 0;

  // Revenue by niche
  const nicheMap = new Map<Niche, { revenue: number; count: number }>();
  for (const deal of completedDeals) {
    const existing = nicheMap.get(deal.niche) ?? { revenue: 0, count: 0 };
    nicheMap.set(deal.niche, {
      revenue: existing.revenue + (deal.agencyCommission ?? 0),
      count: existing.count + 1,
    });
  }
  const revenueByNiche = Array.from(nicheMap.entries()).map(([niche, data]) => ({
    niche,
    ...data,
  }));

  // Content backlog
  const avgContentBacklogDays =
    totalPages > 0
      ? pages.reduce((s, p) => s + p.contentBacklogDays, 0) / totalPages
      : 0;
  const pagesWithLowBacklog = pages.filter((p) => p.contentBacklogDays < 14).length;

  // Operator replaceability
  const pagesWithReplacement = pages.filter((p) => p.replacementReady).length;
  const operatorReplaceabilityScore = totalPages > 0 ? (pagesWithReplacement / totalPages) * 100 : 0;

  // Contract health
  const pagesWithSignedContract = pages.filter((p) => p.contractStatus === "SIGNED").length;
  const signedContractRate = totalPages > 0 ? (pagesWithSignedContract / totalPages) * 100 : 0;

  // Tier distribution
  const tierMap = new Map<string, number>();
  for (const page of pages) {
    tierMap.set(page.tierLevel, (tierMap.get(page.tierLevel) ?? 0) + 1);
  }
  const tierCounts = Array.from(tierMap.entries()).map(([tier, count]) => ({ tier, count }));

  return {
    talentUtilizationRate,
    totalPages,
    pagesWithActiveDeal,
    totalDeals,
    dealsPitched,
    dealsCompleted,
    bookingToSubmissionRatio,
    totalAgencyRevenue,
    avgDealSize,
    revenueByNiche,
    avgContentBacklogDays,
    pagesWithLowBacklog,
    operatorReplaceabilityScore,
    signedContractRate,
    tierCounts,
  };
}
