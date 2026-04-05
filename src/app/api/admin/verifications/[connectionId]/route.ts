import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const verifySchema = z.object({
  status: z.enum(["VERIFIED", "FAILED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    await requireAuth("admin");

    const { connectionId } = await params;
    const body = await req.json();
    const { status } = verifySchema.parse(body);

    const conn = await prisma.creatorIgConnection.findUnique({
      where: { id: connectionId },
      include: { creatorProfile: { include: { user: true } } },
    });

    if (!conn) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    let updated: any;

    if (status === "VERIFIED") {
      updated = await prisma.creatorIgConnection.update({
        where: { id: connectionId },
        data: { isVerified: true, verifiedAt: new Date() },
        include: { bioVerifications: true },
      });

      await prisma.bioVerification.updateMany({
        where: { connectionId },
        data: { status: "VERIFIED", verifiedAt: new Date() },
      });

      if (conn.creatorProfile) {
        await prisma.creatorProfile.update({
          where: { id: conn.creatorProfile.id },
          data: { isVerified: true },
        });
      }

      await prisma.notification.create({
        data: {
          userId: conn.creatorProfile.userId,
          type: "BIO_VERIFIED",
          data: { igUsername: conn.igUsername },
        },
      });
    } else {
      updated = await prisma.creatorIgConnection.update({
        where: { id: connectionId },
        data: { isVerified: false },
        include: { bioVerifications: true },
      });

      await prisma.bioVerification.updateMany({
        where: { connectionId },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ connection: updated });
  } catch (err: any) {
    console.error("[admin verifications PATCH]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
