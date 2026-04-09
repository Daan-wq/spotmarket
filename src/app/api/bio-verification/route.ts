import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

function generateBioCode(): string {
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `CLIPPROFIT ${digits}`;
}

const bioVerificationSchema = z.object({
  igUsername: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: {
        creatorProfile: {
          include: {
            igConnections: {
              include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    const connections = user?.creatorProfile?.igConnections ?? [];
    if (connections.length === 0) {
      return NextResponse.json({ status: null, code: null });
    }

    // Return the most recent pending connection (for the verify flow)
    const pending = connections.find(c => !c.isVerified) ?? connections[0];
    const bio = pending.bioVerifications[0];

    return NextResponse.json({
      status: pending.isVerified ? "verified" : bio?.status?.toLowerCase() || "pending",
      code: bio?.code,
      igUsername: pending.igUsername,
    });
  } catch (err: any) {
    console.error("[bio-verification GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const body = await req.json();
    const { igUsername } = bioVerificationSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: true },
    });

    if (!user?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    // Check if this username already has a pending/verified connection for this creator
    const existing = await prisma.creatorIgConnection.findUnique({
      where: { creatorProfileId_igUsername: { creatorProfileId: user.creatorProfile.id, igUsername } },
      include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (existing) {
      // Already exists — return the existing code (or generate a fresh one if none)
      const latestBio = existing.bioVerifications[0];
      if (latestBio && latestBio.status === "PENDING") {
        return NextResponse.json({ code: latestBio.code, status: "pending" });
      }
      // Generate a new code for a re-verify attempt
      const code = generateBioCode();
      await prisma.bioVerification.create({
        data: { connectionId: existing.id, code, status: "PENDING" },
      });
      return NextResponse.json({ code, status: "pending" }, { status: 201 });
    }

    // New connection
    const code = generateBioCode();
    const conn = await prisma.creatorIgConnection.create({
      data: {
        creatorProfileId: user.creatorProfile.id,
        igUsername,
        verificationCode: nanoid(32),
      },
    });

    await prisma.bioVerification.create({
      data: { connectionId: conn.id, code, status: "PENDING" },
    });

    return NextResponse.json({ code, status: "pending" }, { status: 201 });
  } catch (err: any) {
    console.error("[bio-verification POST]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
