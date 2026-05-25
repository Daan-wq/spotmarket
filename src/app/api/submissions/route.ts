import { NextRequest, NextResponse } from "next/server";
import type { ConnectionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { parseClipUrl, normalizeHandle, type ClipPlatform } from "@/lib/parse-clip-url";
import { findDuplicate } from "@/lib/duplicate-detector";
import { publishEvent } from "@/lib/event-bus";
import { resolveStableSubmissionThumbnail } from "@/lib/clip-thumbnail";
import {
  CAMPAIGN_CLOSED_FOR_SUBMISSIONS_MESSAGE,
  isCampaignClosedForSubmissions,
} from "@/lib/campaign-submission-state";

const createSubmissionSchema = z.object({
  applicationId: z.string().min(1),
  postUrl: z.string().url(),
  screenshotUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  mediaType: z.enum(["video", "image", "carousel"]).optional(),
  connectionId: z.string().min(1).optional(),
});

const PLATFORM_TO_BIO: Record<ClipPlatform, "INSTAGRAM" | "TIKTOK" | "FACEBOOK" | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: null,
  UNKNOWN: null,
};

const PLATFORM_TO_EVENT: Record<ClipPlatform, "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS" | "FACEBOOK" | null> = {
  INSTAGRAM: "INSTAGRAM",
  TIKTOK: "TIKTOK",
  FACEBOOK: "FACEBOOK",
  YOUTUBE: "YOUTUBE_SHORTS",
  UNKNOWN: null,
};

const PLATFORM_TO_CONNECTION: Record<ClipPlatform, ConnectionType | null> = {
  INSTAGRAM: "IG",
  TIKTOK: "TT",
  FACEBOOK: "FB",
  YOUTUBE: "YT",
  UNKNOWN: null,
};

const PLATFORM_LABEL: Record<Exclude<ClipPlatform, "UNKNOWN">, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  FACEBOOK: "Facebook",
  YOUTUBE: "YouTube",
};

interface SourceConnectionOption {
  id: string;
  type: ConnectionType;
  label: string;
  handles: string[];
}

interface ProfileConnections {
  igConnections: Array<{ id: string; igUsername: string }>;
  ttConnections: Array<{ id: string; username: string }>;
  fbConnections: Array<{ id: string; pageHandle: string | null; pageName: string }>;
  ytConnections: Array<{ id: string; channelId: string; channelName: string }>;
}

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await requireAuth("admin", "creator");

    const where: { creatorId?: string } = {};

    if (role === "creator") {
      const creator = await prisma.user.findUnique({
        where: { supabaseId: userId },
        select: { id: true },
      });
      if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      where.creatorId = creator.id;
    }

    const submissions = await prisma.campaignSubmission.findMany({
      where,
      include: {
        campaign: { select: { name: true, id: true } },
        creator: { select: { email: true } },
        application: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ submissions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[submissions GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { applicationId, postUrl, screenshotUrl, thumbnailUrl, mediaType, connectionId } =
      createSubmissionSchema.parse(body);

    const creator = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: {
        creatorProfile: {
          include: {
            igConnections: {
              where: { isVerified: true, accessToken: { not: null } },
            },
            ttConnections: {
              where: { isVerified: true, accessToken: { not: null } },
            },
            fbConnections: {
              where: { isVerified: true, accessToken: { not: null } },
            },
            ytConnections: {
              where: { isVerified: true, accessToken: { not: null } },
            },
          },
        },
      },
    });

    if (!creator?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const profile = creator.creatorProfile;

    const parsed = parseClipUrl(postUrl);

    if (parsed.platform === "UNKNOWN") {
      return NextResponse.json(
        { error: "Unsupported URL. Paste a TikTok, Instagram, Facebook, or YouTube link." },
        { status: 400 },
      );
    }

    // ───────────────────────────────────────────────────────────────────
    // OAuth-only gate — reject if creator has no verified OAuth connection
    // on the submission platform. Direct creator to /creator/connections.
    // ───────────────────────────────────────────────────────────────────
    const platformConnections = sourceConnectionsForPlatform(profile, parsed.platform);
    if (platformConnections.length === 0) {
      return NextResponse.json(
        {
          error: `Connect your ${parsed.platform.toLowerCase()} account before submitting clips.`,
          action: { label: "Connect account", href: "/creator/connections" },
        },
        { status: 400 },
      );
    }

    const sourceConnection = resolveSourceConnection({
      connections: platformConnections,
      connectionId,
      authorHandle: parsed.authorHandle,
    });
    if (sourceConnection.error || !sourceConnection.connection) {
      return NextResponse.json(
        { error: sourceConnection.error ?? "No matching source account found." },
        { status: 400 },
      );
    }

    const app = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: true },
    });

    if (!app || app.creatorProfileId !== profile.id) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
    }

    if (
      isCampaignClosedForSubmissions({
        status: app.campaign.status,
        deadline: app.campaign.deadline,
      })
    ) {
      return NextResponse.json(
        { error: CAMPAIGN_CLOSED_FOR_SUBMISSIONS_MESSAGE },
        { status: 400 },
      );
    }

    // Duplicate detection — URL + author handle. Same clip cannot be submitted
    // twice across the platform (any creator, any campaign).
    const dup = await findDuplicate({ postUrl });
    if (dup) {
      return NextResponse.json(
        {
          error: "This clip has already been submitted.",
          duplicate: { submissionId: dup.submissionId, matchType: dup.matchType },
        },
        { status: 409 },
      );
    }

    const sourcePlatform = PLATFORM_TO_BIO[parsed.platform];

    // Server-side thumbnail stabilization: provider CDN URLs from the client
    // are candidates; final submission thumbnails must be app-owned or stable.
    let resolvedThumbnail: string | null = null;
    let resolvedMediaType: string | null = mediaType ?? null;
    try {
      const stable = await resolveStableSubmissionThumbnail({
        postUrl,
        creatorId: creator.id,
        candidateThumbnailUrl: thumbnailUrl ?? null,
        candidateMediaType: mediaType ?? null,
      });
      resolvedThumbnail = stable.thumbnailUrl;
      resolvedMediaType = stable.mediaType;
    } catch (err) {
      console.warn("[submissions POST] thumbnail resolve failed", err);
    }

    const submission = await prisma.campaignSubmission.create({
      data: {
        applicationId,
        creatorId: creator.id,
        campaignId: app.campaignId,
        postUrl,
        screenshotUrl: screenshotUrl ?? null,
        thumbnailUrl: resolvedThumbnail,
        mediaType: resolvedMediaType,
        claimedViews: 0,
        status: "PENDING",
        sourcePlatform,
        sourceMethod: "OAUTH",
        authorHandle: parsed.authorHandle,
        sourceConnectionType: sourceConnection.connection.type,
        sourceConnectionId: sourceConnection.connection.id,
        logoStatus: "PENDING",
      },
      select: {
        id: true,
        postUrl: true,
        status: true,
        createdAt: true,
        applicationId: true,
        campaignId: true,
        sourcePlatform: true,
        sourceMethod: true,
        sourceConnectionType: true,
        sourceConnectionId: true,
        logoStatus: true,
      },
    });

    const eventPlatform = PLATFORM_TO_EVENT[parsed.platform];
    await prisma.campaignReferralAttribution.updateMany({
      where: {
        campaignId: app.campaignId,
        referredUserId: creator.id,
        firstSubmissionAt: null,
      },
      data: {
        firstSubmissionAt: submission.createdAt,
        socialConnectedAt: submission.createdAt,
      },
    });

    if (eventPlatform) {
      await publishEvent({
        type: "submission.created",
        submissionId: submission.id,
        campaignId: app.campaignId,
        creatorId: creator.id,
        sourcePlatform: eventPlatform,
        occurredAt: submission.createdAt.toISOString(),
      });
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[submissions POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function sourceConnectionsForPlatform(
  profile: ProfileConnections,
  platform: ClipPlatform,
): SourceConnectionOption[] {
  const type = PLATFORM_TO_CONNECTION[platform];
  if (!type || platform === "UNKNOWN") return [];
  const label = PLATFORM_LABEL[platform];

  if (platform === "INSTAGRAM") {
    return profile.igConnections.map((c) => ({
      id: c.id,
      type,
      label,
      handles: [c.igUsername].map(normalizeHandle).filter(isNonNull),
    }));
  }

  if (platform === "TIKTOK") {
    return profile.ttConnections.map((c) => ({
      id: c.id,
      type,
      label,
      handles: [c.username].map(normalizeHandle).filter(isNonNull),
    }));
  }

  if (platform === "FACEBOOK") {
    return profile.fbConnections.map((c) => ({
      id: c.id,
      type,
      label,
      handles: [c.pageHandle, c.pageName].map(normalizeHandle).filter(isNonNull),
    }));
  }

  return profile.ytConnections.map((c) => ({
    id: c.id,
    type,
    label,
    handles: [c.channelId, c.channelName].map(normalizeHandle).filter(isNonNull),
  }));
}

function resolveSourceConnection({
  connections,
  connectionId,
  authorHandle,
}: {
  connections: SourceConnectionOption[];
  connectionId?: string;
  authorHandle: string | null;
}): { connection: SourceConnectionOption | null; error: string | null } {
  const label = connections[0]?.label ?? "platform";
  const normalizedAuthor = normalizeHandle(authorHandle);

  if (connectionId) {
    const selected = connections.find((c) => c.id === connectionId);
    if (!selected) {
      return {
        connection: null,
        error: `Selected ${label} account is not connected.`,
      };
    }

    if (normalizedAuthor && !selected.handles.includes(normalizedAuthor)) {
      return {
        connection: null,
        error: `URL author @${normalizedAuthor} does not match the selected ${label} account.`,
      };
    }

    return { connection: selected, error: null };
  }

  if (normalizedAuthor) {
    const matched = connections.find((c) => c.handles.includes(normalizedAuthor));
    if (!matched) {
      return {
        connection: null,
        error: `URL author @${normalizedAuthor} does not match any of your verified ${label.toLowerCase()} accounts`,
      };
    }

    return { connection: matched, error: null };
  }

  if (connections.length === 1) {
    return { connection: connections[0], error: null };
  }

  return {
    connection: null,
    error: `Select the source ${label} account before submitting this clip.`,
  };
}

function isNonNull<T>(value: T | null): value is T {
  return value !== null;
}
