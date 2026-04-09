import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fetchInstagramBio } from "@/lib/instagram-bio";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json().catch(() => ({}));
    const igUsername: string | undefined = body.igUsername;

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: true },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ status: "pending", verified: false });
    }

    // Find the specific connection (by username if provided, else the latest pending one)
    const conn = igUsername
      ? await prisma.creatorIgConnection.findUnique({
          where: { creatorProfileId_igUsername: { creatorProfileId: user.creatorProfile.id, igUsername } },
          include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : await prisma.creatorIgConnection.findFirst({
          where: { creatorProfileId: user.creatorProfile.id, isVerified: false },
          include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        });

    if (!conn) {
      return NextResponse.json({ status: "pending", verified: false });
    }

    const now = new Date();

    if (conn.isVerified) {
      return NextResponse.json({ status: "verified", verified: true, igUsername: conn.igUsername });
    }

    const bioText = await fetchInstagramBio(conn.igUsername);

    if (bioText === null) {
      return NextResponse.json({
        status: "pending",
        verified: false,
        igUsername: conn.igUsername,
        error: "Could not fetch Instagram profile. Please make sure your account is public.",
      });
    }

    const latestBio = conn.bioVerifications[0];
    const codeToCheck = latestBio?.code ?? conn.verificationCode;
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
        data: {
          userId: user.id,
          type: "BIO_VERIFIED",
          data: { igUsername: conn.igUsername },
        },
      });

      return NextResponse.json({ status: "verified", verified: true, igUsername: conn.igUsername });
    }

    await prisma.creatorIgConnection.update({
      where: { id: conn.id },
      data: { lastCheckedAt: now },
    });

    if (latestBio) {
      await prisma.bioVerification.update({
        where: { id: latestBio.id },
        data: { lastCheckedAt: now },
      });
    }

    return NextResponse.json({
      status: "pending",
      verified: false,
      igUsername: conn.igUsername,
      _debug: {
        codeChecked: codeToCheck,
        codeFoundInHtml: bioText.includes(codeToCheck),
        htmlLength: bioText.length,
        codeIndex: bioText.indexOf(codeToCheck),
      },
    });
  } catch (err: any) {
    console.error("[bio-verification check]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
