import { prisma } from "@/lib/prisma";

export interface CreatorApplicationOption {
  applicationId: string;
  campaignId: string;
  campaignName: string;
  status: string;
  appliedAt: Date;
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
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { appliedAt: "desc" },
  });
  return rows.map((r) => ({
    applicationId: r.id,
    campaignId: r.campaign.id,
    campaignName: r.campaign.name,
    status: r.status,
    appliedAt: r.appliedAt,
  }));
}
