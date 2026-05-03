import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { parseClipUrl, normalizeHandle, type ClipPlatform } from "@/lib/parse-clip-url";
import { findDuplicate } from "@/lib/duplicate-detector";
import { publishEvent } from "@/lib/event-bus";

const createSubmissionSchema = z.object({
  applicationId: z.string().min(1),
  postUrl: z.string().url(),
  screenshotUrl: z.string().url().optional(),
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
    const { applicationId, postUrl, screenshotUrl } = createSubmissionSchema.parse(body);

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
    const hasOAuthForPlatform =
      parsed.platform === "INSTAGRAM"
        ? profile.igConnections.length > 0
        : parsed.platform === "TIKTOK"
          ? profile.ttConnections.length > 0
          : parsed.platform === "FACEBOOK"
            ? profile.fbConnections.length > 0
            : parsed.platform === "YOUTUBE"
              ? profile.ytConnections.length > 0
              : false;

    if (!hasOAuthForPlatform) {
      return NextResponse.json(
        {
          error: `Connect your ${parsed.platform.toLowerCase()} account before submitting clips.`,
          action: { label: "Connect account", href: "/creator/connections" },
        },
        { status: 400 },
      );
    }

    // Anti-fraud: confirm the URL author is one of the creator's verified handles
    // for that platform when extractable.
    if (parsed.authorHandle) {
      const author = normalizeHandle(parsed.authorHandle);
      let match: string[] = [];
      if (parsed.platform === "INSTAGRAM") {
        match = profile.igConnections.map((c) => c.igUsername.toLowerCase());
      } else if (parsed.platform === "TIKTOK") {
        match = profile.ttConnections.map((c) => c.username.toLowerCase());
      } else if (parsed.platform === "FACEBOOK") {
        match = [
          ...profile.fbConnections.map((c) => (c.pageHandle ?? "").toLowerCase()),
          ...profile.fbConnections.map((c) => c.pageName.toLowerCase()),
        ].filter(Boolean);
      }

      if (author && match.length > 0 && !match.includes(author)) {
        return NextResponse.json(
          { error: `URL author @${author} does not match any of your verified ${parsed.platform.toLowerCase()} accounts` },
          { status: 400 },
        );
      }
    }

    const app = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: true },
    });

    if (!app || app.creatorProfileId !== profile.id) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
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

    const submission = await prisma.campaignSubmission.create({
      data: {
        applicationId,
        creatorId: creator.id,
        campaignId: app.campaignId,
        postUrl,
        screenshotUrl: screenshotUrl ?? null,
        claimedViews: 0,
        status: "PENDING",
        sourcePlatform,
        sourceMethod: "OAUTH",
        authorHandle: parsed.authorHandle,
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
        logoStatus: true,
      },
    });

    const eventPlatform = PLATFORM_TO_EVENT[parsed.platform];
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
