import { prisma } from "@/lib/prisma";
import { isCampaignClosedForSubmissions } from "@/lib/campaign-submission-state";

export interface CreatorApplicationOption {
  applicationId: string;
  campaignId: string;
  campaignName: string;
  status: string;
  appliedAt: Date;
  closedForSubmissions: boolean;
}

/**
 * Lists the campaigns a creator has applied to. Used by both the
 * creator applications page and the in-table "Submit for Campaign"
 * picker on Accounts → Content.
 */
export async function listCreatorApplications(
  creatorProfileId: string,
): Promise<CreatorApplicationOption[]> {
  const rows = await prisma.campaignApplication.findMany({
    where: { creatorProfileId },
    include: { campaign: { select: { id: true, name: true, status: true, deadline: true } } },
    orderBy: { appliedAt: "desc" },
  });
  return rows.map((r) => ({
    applicationId: r.id,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    status: r.status,
    appliedAt: r.appliedAt,
    closedForSubmissions: isCampaignClosedForSubmissions({
      status: r.campaign.status,
      deadline: r.campaign.deadline,
    }),
  }));
}
