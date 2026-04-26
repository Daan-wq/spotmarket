import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Prisma } from "@prisma/client";

function generateBioCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `CLIPPROFIT ${digits}`;
}

const platformSchema = z.enum(["instagram", "tiktok", "facebook"]);

const bioVerificationSchema = z.object({
  platform: platformSchema.default("instagram"),
  username: z.string().min(1).optional(),
  igUsername: z.string().min(1).optional(),
}).refine((v) => !!(v.username || v.igUsername), {
  message: "username is required",
});

type PlatformKey = z.infer<typeof platformSchema>;

const platformEnum = {
  instagram: "INSTAGRAM",
  tiktok: "TIKTOK",
  facebook: "FACEBOOK",
} as const;

function normalize(handle: string): string {
  return handle.replace(/^@/, "").trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");
    const url = new URL(req.url);
    const platformParam = (url.searchParams.get("platform") ?? "instagram") as PlatformKey;
    if (!["instagram", "tiktok", "facebook"].includes(platformParam)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: {
        creatorProfile: {
          include: {
            igConnections: {
              include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
              orderBy: { createdAt: "desc" },
            },
            ttConnections: {
              include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
              orderBy: { createdAt: "desc" },
            },
            fbConnections: {
              include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ status: null, code: null });
    }

    if (platformParam === "instagram") {
      const conns = user.creatorProfile.igConnections;
      if (conns.length === 0) return NextResponse.json({ status: null, code: null });
      const pending = conns.find((c) => !c.isVerified) ?? conns[0];
      const bio = pending.bioVerifications[0];
      return NextResponse.json({
        platform: "instagram",
        status: pending.isVerified ? "verified" : bio?.status?.toLowerCase() || "pending",
        code: bio?.code,
        username: pending.igUsername,
      });
    }

    if (platformParam === "tiktok") {
      const conns = user.creatorProfile.ttConnections;
      if (conns.length === 0) return NextResponse.json({ status: null, code: null });
      const pending = conns.find((c) => !c.isVerified) ?? conns[0];
      const bio = pending.bioVerifications[0];
      return NextResponse.json({
        platform: "tiktok",
        status: pending.isVerified ? "verified" : bio?.status?.toLowerCase() || "pending",
        code: bio?.code,
        username: pending.username,
      });
    }

    const conns = user.creatorProfile.fbConnections;
    if (conns.length === 0) return NextResponse.json({ status: null, code: null });
    const pending = conns.find((c) => !c.isVerified) ?? conns[0];
    const bio = pending.bioVerifications[0];
    return NextResponse.json({
      platform: "facebook",
      status: pending.isVerified ? "verified" : bio?.status?.toLowerCase() || "pending",
      code: bio?.code,
      username: pending.pageHandle ?? pending.pageName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[bio-verification GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const parsed = bioVerificationSchema.parse(body);
    const platform: PlatformKey = parsed.platform;
    const rawHandle = parsed.username ?? parsed.igUsername!;
    const handle = normalize(rawHandle);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: true },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const profileId = user.creatorProfile.id;

    if (platform === "instagram") {
      const existing = await prisma.creatorIgConnection.findUnique({
        where: { creatorProfileId_igUsername: { creatorProfileId: profileId, igUsername: handle } },
        include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      if (existing) {
        const latest = existing.bioVerifications[0];
        if (latest && latest.status === "PENDING") {
          return NextResponse.json({ platform, code: latest.code, status: "pending" });
        }
        const code = generateBioCode();
        await prisma.bioVerification.create({
          data: { connectionId: existing.id, platform: "INSTAGRAM", code, status: "PENDING" },
        });
        return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
      }

      const code = generateBioCode();
      const conn = await prisma.creatorIgConnection.create({
        data: {
          creatorProfileId: profileId,
          igUsername: handle,
          verificationCode: nanoid(32),
        },
      });
      await prisma.bioVerification.create({
        data: { connectionId: conn.id, platform: "INSTAGRAM", code, status: "PENDING" },
      });
      return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
    }

    if (platform === "tiktok") {
      const existing = await prisma.creatorTikTokConnection.findUnique({
        where: { creatorProfileId_username: { creatorProfileId: profileId, username: handle } },
        include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      if (existing) {
        const latest = existing.bioVerifications[0];
        if (latest && latest.status === "PENDING") {
          return NextResponse.json({ platform, code: latest.code, status: "pending" });
        }
        const code = generateBioCode();
        await prisma.bioVerification.create({
          data: { tiktokConnectionId: existing.id, platform: "TIKTOK", code, status: "PENDING" },
        });
        return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
      }

      const code = generateBioCode();
      const conn = await prisma.creatorTikTokConnection.create({
        data: {
          creatorProfileId: profileId,
          username: handle,
          isVerified: false,
        },
      });
      await prisma.bioVerification.create({
        data: { tiktokConnectionId: conn.id, platform: "TIKTOK", code, status: "PENDING" },
      });
      return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
    }

    const existing = await prisma.creatorFbConnection.findUnique({
      where: { creatorProfileId_pageHandle: { creatorProfileId: profileId, pageHandle: handle } },
      include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (existing) {
      const latest = existing.bioVerifications[0];
      if (latest && latest.status === "PENDING") {
        return NextResponse.json({ platform, code: latest.code, status: "pending" });
      }
      const code = generateBioCode();
      await prisma.bioVerification.create({
        data: { fbConnectionId: existing.id, platform: "FACEBOOK", code, status: "PENDING" },
      });
      return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
    }

    const code = generateBioCode();
    const conn = await prisma.creatorFbConnection.create({
      data: {
        creatorProfileId: profileId,
        pageHandle: handle,
        pageName: handle,
        isVerified: false,
      },
    });
    await prisma.bioVerification.create({
      data: { fbConnectionId: conn.id, platform: "FACEBOOK", code, status: "PENDING" },
    });
    return NextResponse.json({ platform, code, status: "pending" }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Handle already linked to another account" }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[bio-verification POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
