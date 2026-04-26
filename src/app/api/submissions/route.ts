import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { parseClipUrl, normalizeHandle, type ClipPlatform } from "@/lib/parse-clip-url";

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
            igConnections: { where: { isVerified: true } },
            ttConnections: { where: { isVerified: true } },
            fbConnections: { where: { isVerified: true } },
          },
        },
      },
    });

    if (!creator?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const profile = creator.creatorProfile;
    const verifiedIg = profile.igConnections;
    const verifiedTt = profile.ttConnections;
    const verifiedFb = profile.fbConnections;

    const hasAnyVerified = verifiedIg.length > 0 || verifiedTt.length > 0 || verifiedFb.length > 0;
    if (!hasAnyVerified) {
      return NextResponse.json(
        { error: "Verify at least one social account before submitting clips" },
        { status: 400 },
      );
    }

    const parsed = parseClipUrl(postUrl);

    if (parsed.platform === "UNKNOWN") {
      return NextResponse.json(
        { error: "Unsupported URL. Paste a TikTok, Instagram, Facebook, or YouTube link." },
        { status: 400 },
      );
    }

    // Anti-fraud: confirm the URL author is one of the creator's verified handles
    // for that platform. Skip when we can't extract the handle from the URL
    // (short links, IG reel URLs without handle) — admin review covers those.
    if (parsed.authorHandle) {
      const author = normalizeHandle(parsed.authorHandle);
      let match: string[] = [];
      if (parsed.platform === "INSTAGRAM") {
        match = verifiedIg.map((c) => c.igUsername.toLowerCase());
      } else if (parsed.platform === "TIKTOK") {
        match = verifiedTt.map((c) => c.username.toLowerCase());
      } else if (parsed.platform === "FACEBOOK") {
        match = [
          ...verifiedFb.map((c) => (c.pageHandle ?? "").toLowerCase()),
          ...verifiedFb.map((c) => c.pageName.toLowerCase()),
        ].filter(Boolean);
      }

      if (author && match.length > 0 && !match.includes(author)) {
        return NextResponse.json(
          { error: `URL author @${author} does not match any of your verified ${parsed.platform.toLowerCase()} accounts` },
          { status: 400 },
        );
      }
    }

    // For platforms we *do* know how to bio-verify (IG/TT/FB), require a
    // matching verified handle on that platform. For YouTube we only require
    // *any* verified handle (existing OAuth path).
    const requiredBioPlatform = PLATFORM_TO_BIO[parsed.platform];
    if (requiredBioPlatform) {
      const verifiedForPlatform =
        requiredBioPlatform === "INSTAGRAM"
          ? verifiedIg.length > 0
          : requiredBioPlatform === "TIKTOK"
            ? verifiedTt.length > 0
            : verifiedFb.length > 0;
      if (!verifiedForPlatform) {
        return NextResponse.json(
          {
            error: `Verify at least one ${parsed.platform.toLowerCase()} account before submitting clips from this platform`,
          },
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

    // Determine submission method: did the creator use OAuth (token present)
    // for this platform, or only bio-verify?
    const oauthForPlatform =
      parsed.platform === "INSTAGRAM"
        ? verifiedIg.some((c) => c.accessToken)
        : parsed.platform === "TIKTOK"
          ? verifiedTt.some((c) => c.accessToken)
          : parsed.platform === "FACEBOOK"
            ? verifiedFb.some((c) => c.accessToken)
            : false;
    const sourceMethod = oauthForPlatform ? "OAUTH" : "BIO_VERIFY";

    const submission = await prisma.campaignSubmission.create({
      data: {
        applicationId,
        creatorId: creator.id,
        campaignId: app.campaignId,
        postUrl,
        screenshotUrl: screenshotUrl ?? null,
        claimedViews: 0,
        status: "PENDING",
        sourcePlatform: requiredBioPlatform,
        sourceMethod,
        authorHandle: parsed.authorHandle,
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
      },
    });

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
