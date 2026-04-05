import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";
import { z } from "zod";

const bioVerificationSchema = z.object({
  igUsername: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: { include: { igConnection: { include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } } } } } },
    });

    if (!user?.creatorProfile?.igConnection) {
      return NextResponse.json({ status: null, code: null });
    }

    const conn = user.creatorProfile.igConnection;
    const bio = conn.bioVerifications[0];

    return NextResponse.json({
      status: conn.isVerified ? "verified" : bio?.status?.toLowerCase() || "pending",
      code: bio?.code,
      igUsername: conn.igUsername,
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

    const code = nanoid(6).toUpperCase();

    let conn = await prisma.creatorIgConnection.findUnique({
      where: { creatorProfileId: user.creatorProfile.id },
    });

    if (!conn) {
      conn = await prisma.creatorIgConnection.create({
        data: {
          creatorProfileId: user.creatorProfile.id,
          igUsername,
          verificationCode: nanoid(32),
        },
      });
    } else {
      conn = await prisma.creatorIgConnection.update({
        where: { id: conn.id },
        data: { igUsername },
      });
    }

    const bio = await prisma.bioVerification.create({
      data: {
        connectionId: conn.id,
        code,
        status: "PENDING",
      },
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
