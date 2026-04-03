import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  await requireAuth("admin");

  const body = await req.json();
  const { applicationId, socialAccountId } = body as {
    applicationId: string;
    socialAccountId: string;
  };

  if (!applicationId || !socialAccountId) {
    return NextResponse.json({ error: "applicationId and socialAccountId required" }, { status: 400 });
  }

  const code = `CP-${nanoid(6).toUpperCase()}`;

  const verification = await prisma.bioVerification.upsert({
    where: {
      applicationId_socialAccountId: { applicationId, socialAccountId },
    },
    update: {
      code,
      status: "PENDING",
      lastCheckedAt: null,
      verifiedAt: null,
    },
    create: {
      applicationId,
      socialAccountId,
      code,
    },
  });

  return NextResponse.json({ code: verification.code, verificationId: verification.id });
}
