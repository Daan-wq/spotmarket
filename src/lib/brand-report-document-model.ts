import type { CampaignReportEditorial } from "@/lib/admin/campaign-report-shared";
import { renderCampaignReportTemplate } from "@/lib/admin/campaign-report-display";
import type { BrandReportLiveData } from "@/lib/brand-report-portal";

export const CPM_EXPLANATION =
  "De effectieve CPM laat zien wat je werkelijk betaalt per 1.000 bereikte views. Ligt deze lager dan de afgesproken CPM, dan krijg je meer bereik voor hetzelfde budget.";

interface BrandReportDocumentInput {
  report: {
    title: string;
  };
  data: BrandReportLiveData;
  editorial: CampaignReportEditorial;
}

export function buildBrandReportDocumentModel({
  report,
  data,
  editorial,
}: BrandReportDocumentInput) {
  const blocks = editorial.editorialContent.templateBlocks;
  const sections = editorial.sectionSettings;
  const copy = (key: string, fallback: string) => renderCampaignReportTemplate(
    blocks[key] ?? fallback,
    data,
    { mode: "live" },
  );
  const paidViews = data.performance.targetViews
    ? Math.min(data.performance.currentViews, data.performance.targetViews)
    : data.performance.paidEligibleViews;
  const hasAllowedInstagram = data.campaign.platforms.length === 0
    || data.campaign.platforms.some((platform) => platform.toLowerCase().includes("instagram"));
  const audience = sections.audienceReach && hasAllowedInstagram && data.audience.sampleCount > 0
    ? {
        sampleCount: data.audience.sampleCount,
        platformsLabel: data.audience.platformsLabel,
        ageBuckets: data.audience.ageBuckets,
        genderSplit: data.audience.genderSplit,
        topCountries: data.audience.topCountries,
        insight: copy(
          "audience.insight",
          "Demografische data is gebaseerd op beschikbare accountdata van {{audience.platformsLabel}}. De beschikbaarheid kan per platform en account verschillen.",
        ),
      }
    : null;

  return {
    title: report.title,
    brandName: data.campaign.brandName,
    campaignName: data.campaign.name,
    period: data.period,
    generatedAt: data.generatedAt,
    sections,
    cover: sections.cover
      ? {
          kicker: copy("cover.kicker", "Campagne prestatierapport"),
          title: report.title,
        }
      : null,
    summary: sections.executiveSummary
      ? {
          kicker: copy("section.summary.kicker", "Samenvatting"),
          title: copy("section.summary.title", "Resultaat in een oogopslag"),
          body: renderCampaignReportTemplate(
            blocks["summary.body"] || editorial.executiveSummary,
            data,
            { mode: "live" },
          ),
          takeaways: editorial.keyTakeaways.slice(0, 4),
        }
      : null,
    result: sections.campaignAtAGlance
      ? {
          kicker: copy("section.glance.kicker", "Campagne in het kort"),
          title: copy("section.glance.title", "Doel, bereik en overdelivery"),
          currentViews: data.performance.currentViews,
          targetViews: data.performance.targetViews,
          paidViews,
          extraReach: data.performance.overdeliveryViews,
          approvedClips: data.performance.approvedClips,
          budgetUsed: data.performance.budgetUsed,
          budgetUsedPercent: data.performance.budgetUsedPercent,
        }
      : null,
    metrics: {
      currentViews: data.performance.currentViews,
      targetViews: data.performance.targetViews,
      approvedClips: data.performance.approvedClips,
      uniquePages: data.performance.uniquePages,
      totalEngagement: data.performance.totalEngagement,
    },
    cpm: {
      agreed: data.campaign.businessCpm,
      effective: data.performance.effectiveCpm,
      explanation: CPM_EXPLANATION,
    },
    performance: sections.campaignPerformance
      ? {
          kicker: copy("section.performance.kicker", "Campagneprestatie"),
          title: copy("section.performance.title", "Groei van de campagne"),
          timeline: data.timeline,
          insight: copy(
            "performance.insight",
            "De cumulatieve viewlijn laat zien wanneer de campagne tractie kreeg en performance versnelde.",
          ),
        }
      : null,
    platforms: sections.platformPerformance && data.platformBreakdown.length > 0
      ? {
          kicker: copy("section.platform.kicker", "Platformprestaties"),
          title: copy("section.platform.title", "Kanaalvergelijking"),
          rows: data.platformBreakdown.map((row) => ({
            ...row,
            agreedCpm: data.campaign.businessCpm,
            recommendation: editorial.editorialContent.platformRecommendations[row.platform] ?? "",
          })),
        }
      : null,
    content: sections.contentPerformance && data.topContent.length > 0
      ? {
          kicker: copy("section.content.kicker", "Contentprestaties"),
          title: copy("section.content.title", "Topcontent"),
          rows: data.topContent.slice(0, 6),
        }
      : null,
    creators: sections.creatorContribution && data.creators.length > 0
      ? {
          kicker: copy("section.creator.kicker", "Creatorbijdrage"),
          title: copy("section.creator.title", "Bijdrage van creators"),
          rows: data.creators.slice(0, 8),
        }
      : null,
    audience,
    budget: sections.budgetValue
      ? {
          totalBudget: data.campaign.totalBudget,
          budgetUsed: data.performance.budgetUsed,
          budgetRemaining: data.performance.budgetRemaining,
          paidViews,
          extraReach: data.performance.overdeliveryViews,
          note: editorial.editorialContent.financialNote,
        }
      : null,
    quality: sections.qualityAssurance
      ? {
          reviewedClips: data.quality.reviewedClips,
          excludedClips: data.quality.excludedClips,
          excludedViews: data.quality.excludedViews,
        }
      : null,
    recommendations: sections.nextCampaign
      ? {
          kicker: copy("section.next.kicker", "Aanbevelingen"),
          title: copy("section.next.title", "Concreet plan voor de volgende ronde"),
          items: [
            ...editorial.nextCampaignRecommendations,
            ...editorial.learnings,
          ].filter(Boolean).slice(0, 6),
        }
      : null,
    appendix: sections.appendix
      ? {
          note: editorial.editorialContent.appendixNote,
        }
      : null,
  };
}

export type BrandReportDocumentModel = ReturnType<typeof buildBrandReportDocumentModel>;
