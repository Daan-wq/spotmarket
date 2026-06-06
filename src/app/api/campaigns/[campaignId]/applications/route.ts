import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  buildConnectRequiredMessage,
  evaluateCampaignJoinEligibility,
} from "@/lib/campaign-eligibility";
import {
  getCampaignClosedForSubmissionsMessage,
  isCampaignClosedForSubmissions,
} from "@/lib/campaign-submission-state";
import { getSocialAccountSummariesForProfile } from "@/lib/social-account-summary";
import {
  addDiscordCampaignRole,
  DiscordCampaignRoleError,
  removeDiscordCampaignRole,
} from "@/lib/discord-campaign-roles";
import { ensureDiscordCampaignProvisioning } from "@/lib/discord-campaign-provisioning";
import {
  campaignBioGateIsConfigured,
  campaignRequiresBioGate,
  getCreatorCampaignAccountOptions,
  type CampaignBioVerificationResult,
  verifySelectedCampaignAccounts,
} from "@/lib/campaign-bio-gate";

const selectedAccountSchema = z.object({
  connectionType: z.enum(["IG", "TT", "YT", "FB"]),
  connectionId: z.string().min(1),
});

const joinBodySchema = z.object({
  selectedAccounts: z.array(selectedAccountSchema).optional().default([]),
  skipFailedConnectionIds: z.array(z.string().min(1)).optional().default([]),
});

function discordRoleErrorResponse(err: unknown) {
  if (err instanceof DiscordCampaignRoleError) {
    return NextResponse.json(
      { code: err.code, error: err.message },
      { status: err.status },
    );
  }

  return NextResponse.json(
    { code: "DISCORD_ROLE_SYNC_FAILED", error: "Discord role sync failed." },
    { status: 502 },
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    await requireAuth("admin");
    const { campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const applications = await prisma.campaignApplication.findMany({
      where: { campaignId },
      include: {
        creatorProfile: { select: { displayName: true, totalFollowers: true, igConnections: { select: { igUsername: true, isVerified: true }, take: 1, where: { isVerified: true } } } },
      },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err: unknown) {
    console.error("[campaigns applications GET]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await requireAuth("creator");
    const { campaignId } = await params;
    const body = joinBodySchema.parse(await readJsonBody(req));

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (
      isCampaignClosedForSubmissions({
        status: campaign.status,
        deadline: campaign.deadline,
      })
    ) {
      return NextResponse.json(
        { error: getCampaignClosedForSubmissionsMessage({ status: campaign.status }) },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: {
        creatorProfile: {
          include: {
            igConnections: true,
            ttConnections: true,
            ytConnections: true,
            fbConnections: true,
          },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    if (!user.discordId) {
      return NextResponse.json(
        {
          code: "DISCORD_REQUIRED",
          error: "Connect Discord before joining this campaign.",
        },
        { status: 400 },
      );
    }

    const socialAccounts = await getSocialAccountSummariesForProfile(user.creatorProfile.id);
    const eligibility = evaluateCampaignJoinEligibility(campaign.platforms, {
      instagram: socialAccounts.ig.some((c) => c.isVerified),
      tiktok: socialAccounts.tt.some((c) => c.isVerified),
      youtube: socialAccounts.yt.some((c) => c.isVerified),
      facebook: socialAccounts.fb.some((c) => c.isVerified),
    });
    const followerSnapshot = Math.max(
      0,
      ...socialAccounts.ig.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.fb.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.yt.map((c) => c.audienceCount ?? 0),
      ...socialAccounts.tt.map((c) => c.audienceCount ?? 0),
    );

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          code: "CONNECT_REQUIRED",
          error: buildConnectRequiredMessage(eligibility.missingPlatformLabels),
          missingPlatforms: eligibility.missingPlatforms,
          requiredPlatformLabels: eligibility.missingPlatformLabels,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.campaignApplication.findFirst({
      where: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
      },
    });

    const bioGateRequired = campaignRequiresBioGate(campaign);
    const existingIsFinal =
      existing && ["active", "approved", "completed"].includes(existing.status);
    if (existing && (!bioGateRequired || existingIsFinal)) {
      return NextResponse.json({ error: "Already applied" }, { status: 409 });
    }

    if (bioGateRequired) {
      if (!campaignBioGateIsConfigured(campaign)) {
        return NextResponse.json(
          {
            code: "BIO_GATE_NOT_CONFIGURED",
            error: "Campaign bio gate is not configured.",
          },
          { status: 400 },
        );
      }

      if (body.selectedAccounts.length === 0) {
        const accounts = await getCreatorCampaignAccountOptions(
          user.creatorProfile.id,
          campaign.platforms,
        );
        return NextResponse.json(
          {
            code: "BIO_ACCOUNTS_REQUIRED",
            error: "Select at least one account for this campaign.",
            accounts,
          },
          { status: 400 },
        );
      }

      const verificationResults = await verifySelectedCampaignAccounts({
        creatorProfileId: user.creatorProfile.id,
        campaign,
        selectedAccounts: body.selectedAccounts,
      });
      const skipIds = new Set(body.skipFailedConnectionIds);
      const verified = verificationResults.filter((result) => result.status === "VERIFIED");
      const failed = verificationResults.filter((result) => result.status === "FAILED");
      const unskippedFailed = failed.filter((result) => !skipIds.has(result.connectionId));

      const application = existing ?? await prisma.campaignApplication.create({
        data: {
          campaignId,
          creatorProfileId: user.creatorProfile.id,
          followerSnapshot,
          engagementSnapshot: user.creatorProfile.engagementRate,
          status: "pending",
        },
        include: { creatorProfile: true },
      });

      await persistApplicationConnectionResults({
        applicationId: application.id,
        results: verificationResults,
        skipFailedConnectionIds: skipIds,
      });

      if (verified.length === 0 || unskippedFailed.length > 0) {
        return NextResponse.json(
          {
            code: "BIO_VERIFICATION_FAILED",
            error: "One or more selected pages do not meet the bio requirements.",
            id: application.id,
            application,
            verifiedAccounts: verified,
            failedAccounts: failed,
          },
          { status: 422 },
        );
      }

      try {
        const provisioned = await ensureDiscordCampaignProvisioning(campaign);
        await addDiscordCampaignRole(provisioned.campaign, user.discordId);
      } catch (err) {
        return discordRoleErrorResponse(err);
      }

      const activeApplication = await prisma.campaignApplication.update({
        where: { id: application.id },
        data: {
          status: "active",
          reviewedAt: new Date(),
          reviewNotes: "Automatically approved after campaign bio verification.",
        },
        include: { creatorProfile: true },
      });

      await createApplicationApprovedNotification({
        campaign,
        userId: user.id,
        creatorName: user.creatorProfile.displayName,
      });

      return NextResponse.json(
        {
          id: activeApplication.id,
          application: activeApplication,
          verifiedAccounts: verified,
          skippedAccountIds: body.skipFailedConnectionIds,
        },
        { status: 201 },
      );
    }

    try {
      const provisioned = await ensureDiscordCampaignProvisioning(campaign);
      await addDiscordCampaignRole(provisioned.campaign, user.discordId);
    } catch (err) {
      return discordRoleErrorResponse(err);
    }

    const application = await prisma.campaignApplication.create({
      data: {
        campaignId,
        creatorProfileId: user.creatorProfile.id,
        followerSnapshot,
        engagementSnapshot: user.creatorProfile.engagementRate,
        status: "pending",
      },
      include: { creatorProfile: true },
    });

    await createApplicationApprovedNotification({
      campaign,
      userId: user.id,
      creatorName: user.creatorProfile.displayName,
    });

    return NextResponse.json({ id: application.id, application }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error("[campaigns applications POST]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await requireAuth("creator");
    const { campaignId } = await params;

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: {
        discordId: true,
        creatorProfile: { select: { id: true } },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const application = await prisma.campaignApplication.findFirst({
      where: { campaignId, creatorProfileId: user.creatorProfile.id },
      include: {
        campaign: true,
        submissions: { select: { id: true }, take: 1 },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.submissions.length > 0) {
      return NextResponse.json(
        { error: "Campaigns with submitted clips cannot be left from this endpoint." },
        { status: 409 },
      );
    }

    if (user.discordId) {
      try {
        await removeDiscordCampaignRole(application.campaign, user.discordId);
      } catch (err) {
        return discordRoleErrorResponse(err);
      }
    }

    await prisma.campaignApplication.delete({ where: { id: application.id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    console.error("[campaigns applications DELETE]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

async function persistApplicationConnectionResults({
  applicationId,
  results,
  skipFailedConnectionIds,
}: {
  applicationId: string;
  results: CampaignBioVerificationResult[];
  skipFailedConnectionIds: Set<string>;
}) {
  const checkedAt = new Date();
  await Promise.all(
    results.map((result) => {
      const skipped = result.status === "FAILED" && skipFailedConnectionIds.has(result.connectionId);
      return prisma.campaignApplicationConnection.upsert({
        where: {
          applicationId_connectionType_connectionId: {
            applicationId,
            connectionType: result.connectionType,
            connectionId: result.connectionId,
          },
        },
        create: {
          applicationId,
          connectionType: result.connectionType,
          connectionId: result.connectionId,
          status: skipped ? "SKIPPED" : result.status,
          lastCheckedAt: checkedAt,
          verifiedAt: result.status === "VERIFIED" ? checkedAt : null,
          missingKeywords: result.missingKeywords,
          failureReason: skipped ? "Skipped by creator." : result.failureReason,
        },
        update: {
          status: skipped ? "SKIPPED" : result.status,
          lastCheckedAt: checkedAt,
          verifiedAt: result.status === "VERIFIED" ? checkedAt : null,
          missingKeywords: result.missingKeywords,
          failureReason: skipped ? "Skipped by creator." : result.failureReason,
        },
      });
    }),
  );
}

async function createApplicationApprovedNotification({
  campaign,
  userId,
  creatorName,
}: {
  campaign: { id: string; createdByUserId: string | null };
  userId: string;
  creatorName: string | null;
}) {
  await prisma.notification.create({
    data: {
      userId: campaign.createdByUserId || userId,
      type: "APPLICATION_APPROVED",
      data: {
        campaignId: campaign.id,
        creatorName,
      },
    },
  });
}

async function readJsonBody(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  if (!text.trim()) return {};
  return JSON.parse(text);
}
