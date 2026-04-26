import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fetchInstagramBio } from "@/lib/instagram-bio";
import { fetchTikTokBio } from "@/lib/tiktok-bio";
import { fetchFacebookBio } from "@/lib/facebook-bio";
import { z } from "zod";

const checkSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "facebook"]).default("instagram"),
  username: z.string().min(1).optional(),
  igUsername: z.string().min(1).optional(),
});

type PlatformKey = z.infer<typeof checkSchema>["platform"];

function normalize(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json().catch(() => ({}));
    const parsed = checkSchema.parse(body);
    const platform: PlatformKey = parsed.platform;
    const rawHandle = parsed.username ?? parsed.igUsername;
    const handle = rawHandle ? normalize(rawHandle) : undefined;

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: true },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ status: "pending", verified: false });
    }
    const profileId = user.creatorProfile.id;
    const now = new Date();

    if (platform === "instagram") {
      const conn = handle
        ? await prisma.creatorIgConnection.findUnique({
            where: { creatorProfileId_igUsername: { creatorProfileId: profileId, igUsername: handle } },
            include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
          })
        : await prisma.creatorIgConnection.findFirst({
            where: { creatorProfileId: profileId, isVerified: false },
            include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
            orderBy: { createdAt: "desc" },
          });

      if (!conn) return NextResponse.json({ status: "pending", verified: false });
      if (conn.isVerified) {
        return NextResponse.json({ status: "verified", verified: true, platform, username: conn.igUsername });
      }

      const bioText = await fetchInstagramBio(conn.igUsername);
      if (bioText === null) {
        return NextResponse.json({
          status: "pending",
          verified: false,
          platform,
          username: conn.igUsername,
          error: "Could not fetch Instagram profile. Please make sure your account is public.",
        });
      }

      const latest = conn.bioVerifications[0];
      const codeToCheck = latest?.code ?? conn.verificationCode;
      const codeInBio = bioText.includes(codeToCheck);

      if (codeInBio) {
        await prisma.creatorIgConnection.update({
          where: { id: conn.id },
          data: { isVerified: true, verifiedAt: now, lastCheckedAt: now },
        });
        await prisma.bioVerification.updateMany({
          where: { connectionId: conn.id, status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: now, lastCheckedAt: now },
        });
        await prisma.creatorProfile.update({
          where: { id: conn.creatorProfileId },
          data: { isVerified: true },
        });
        await prisma.notification.create({
          data: { userId: user.id, type: "BIO_VERIFIED", data: { platform: "instagram", username: conn.igUsername } },
        });
        return NextResponse.json({ status: "verified", verified: true, platform, username: conn.igUsername });
      }

      await prisma.creatorIgConnection.update({ where: { id: conn.id }, data: { lastCheckedAt: now } });
      if (latest) {
        await prisma.bioVerification.update({ where: { id: latest.id }, data: { lastCheckedAt: now } });
      }
      return NextResponse.json({ status: "pending", verified: false, platform, username: conn.igUsername });
    }

    if (platform === "tiktok") {
      const conn = handle
        ? await prisma.creatorTikTokConnection.findUnique({
            where: { creatorProfileId_username: { creatorProfileId: profileId, username: handle } },
            include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
          })
        : await prisma.creatorTikTokConnection.findFirst({
            where: { creatorProfileId: profileId, isVerified: false },
            include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
            orderBy: { createdAt: "desc" },
          });

      if (!conn) return NextResponse.json({ status: "pending", verified: false });
      if (conn.isVerified) {
        return NextResponse.json({ status: "verified", verified: true, platform, username: conn.username });
      }

      const result = await fetchTikTokBio(conn.username);
      if (!result) {
        return NextResponse.json({
          status: "pending",
          verified: false,
          platform,
          username: conn.username,
          error: "Could not fetch TikTok profile. Please make sure your account is public and try again in a moment.",
        });
      }

      const latest = conn.bioVerifications[0];
      const codeToCheck = latest?.code;
      if (!codeToCheck) {
        return NextResponse.json({
          status: "pending",
          verified: false,
          platform,
          username: conn.username,
          error: "No active verification code. Please restart verification.",
        });
      }
      const codeInBio = result.bio.includes(codeToCheck);

      if (codeInBio) {
        await prisma.creatorTikTokConnection.update({
          where: { id: conn.id },
          data: {
            isVerified: true,
            verifiedAt: now,
            lastCheckedAt: now,
            displayName: result.displayName ?? conn.displayName,
            profilePicUrl: result.avatarUrl ?? conn.profilePicUrl,
            followerCount: result.followerCount ?? conn.followerCount,
          },
        });
        await prisma.bioVerification.updateMany({
          where: { tiktokConnectionId: conn.id, status: "PENDING" },
          data: { status: "VERIFIED", verifiedAt: now, lastCheckedAt: now },
        });
        await prisma.creatorProfile.update({
          where: { id: conn.creatorProfileId },
          data: { isVerified: true },
        });
        await prisma.notification.create({
          data: { userId: user.id, type: "BIO_VERIFIED", data: { platform: "tiktok", username: conn.username } },
        });
        return NextResponse.json({ status: "verified", verified: true, platform, username: conn.username });
      }

      await prisma.creatorTikTokConnection.update({ where: { id: conn.id }, data: { lastCheckedAt: now } });
      if (latest) {
        await prisma.bioVerification.update({ where: { id: latest.id }, data: { lastCheckedAt: now } });
      }
      return NextResponse.json({ status: "pending", verified: false, platform, username: conn.username });
    }

    // facebook
    const conn = handle
      ? await prisma.creatorFbConnection.findUnique({
          where: { creatorProfileId_pageHandle: { creatorProfileId: profileId, pageHandle: handle } },
          include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : await prisma.creatorFbConnection.findFirst({
          where: { creatorProfileId: profileId, isVerified: false },
          include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        });

    if (!conn) return NextResponse.json({ status: "pending", verified: false });
    if (conn.isVerified) {
      return NextResponse.json({ status: "verified", verified: true, platform, username: conn.pageHandle ?? conn.pageName });
    }

    const fbHandle = conn.pageHandle ?? conn.pageName;
    const result = await fetchFacebookBio(fbHandle);
    if (!result) {
      return NextResponse.json({
        status: "pending",
        verified: false,
        platform,
        username: fbHandle,
        error: "Could not fetch Facebook page. Please make sure it's a public Page (not a personal profile).",
      });
    }

    const latest = conn.bioVerifications[0];
    const codeToCheck = latest?.code;
    if (!codeToCheck) {
      return NextResponse.json({
        status: "pending",
        verified: false,
        platform,
        username: fbHandle,
        error: "No active verification code. Please restart verification.",
      });
    }
    const codeInBio = result.bio.includes(codeToCheck);

    if (codeInBio) {
      await prisma.creatorFbConnection.update({
        where: { id: conn.id },
        data: {
          isVerified: true,
          verifiedAt: now,
          lastCheckedAt: now,
          pageName: result.pageName ?? conn.pageName,
          profilePicUrl: result.profilePicUrl ?? conn.profilePicUrl,
          followerCount: result.followerCount ?? conn.followerCount,
          fbPageId: result.fbPageId ?? conn.fbPageId,
        },
      });
      await prisma.bioVerification.updateMany({
        where: { fbConnectionId: conn.id, status: "PENDING" },
        data: { status: "VERIFIED", verifiedAt: now, lastCheckedAt: now },
      });
      await prisma.creatorProfile.update({
        where: { id: conn.creatorProfileId },
        data: { isVerified: true },
      });
      await prisma.notification.create({
        data: { userId: user.id, type: "BIO_VERIFIED", data: { platform: "facebook", username: fbHandle } },
      });
      return NextResponse.json({ status: "verified", verified: true, platform, username: fbHandle });
    }

    await prisma.creatorFbConnection.update({ where: { id: conn.id }, data: { lastCheckedAt: now } });
    if (latest) {
      await prisma.bioVerification.update({ where: { id: latest.id }, data: { lastCheckedAt: now } });
    }
    return NextResponse.json({ status: "pending", verified: false, platform, username: fbHandle });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[bio-verification check]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
