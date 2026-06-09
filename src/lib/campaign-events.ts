import type {
  CampaignEventType,
  CampaignStatus,
  Prisma,
} from "@prisma/client";

interface CampaignEventCreateInput {
  campaignId: string;
  previousStatus: CampaignStatus | string;
  nextStatus: CampaignStatus | string;
  previousUpdatedAt: Date;
  occurredAt?: Date;
  createdByUserId?: string | null;
}

interface UpdateCampaignWithEventInput {
  campaignId: string;
  previousStatus: CampaignStatus | string;
  previousUpdatedAt: Date;
  nextStatus: CampaignStatus | string;
  data: Prisma.CampaignUpdateArgs["data"];
  createdByUserId?: string | null;
}

export function getCampaignEventType(
  previousStatus: CampaignStatus | string,
  nextStatus: CampaignStatus | string,
): CampaignEventType | null {
  if (previousStatus === nextStatus) return null;
  if (nextStatus === "completed") return "COMPLETED";
  if (previousStatus === "paused" && nextStatus === "active") return "RESUMED";
  if (nextStatus === "active") return "STARTED";
  if (previousStatus === "active" && nextStatus === "paused") return "PAUSED";
  return null;
}

export function buildCampaignEventCreate({
  campaignId,
  previousStatus,
  nextStatus,
  previousUpdatedAt,
  occurredAt = new Date(),
  createdByUserId = null,
}: CampaignEventCreateInput) {
  const type = getCampaignEventType(previousStatus, nextStatus);
  if (!type) return null;

  return {
    campaignId,
    type,
    occurredAt,
    createdByUserId,
    transitionKey: [
      campaignId,
      previousStatus,
      nextStatus,
      previousUpdatedAt.toISOString(),
    ].join(":"),
  };
}

export async function updateCampaignWithEvent(
  tx: Prisma.TransactionClient,
  {
    campaignId,
    previousStatus,
    previousUpdatedAt,
    nextStatus,
    data,
    createdByUserId = null,
  }: UpdateCampaignWithEventInput,
) {
  const updated = await tx.campaign.update({
    where: { id: campaignId },
    data,
  });
  const event = buildCampaignEventCreate({
    campaignId,
    previousStatus,
    nextStatus,
    previousUpdatedAt,
    createdByUserId,
  });

  if (event) {
    await tx.campaignEvent.upsert({
      where: { transitionKey: event.transitionKey },
      create: event,
      update: {},
    });
  }

  return updated;
}
