import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  await requireAuth("admin");

  const body = await req.json();
  const { verificationId } = body as { verificationId: string };

  if (!verificationId) {
    return NextResponse.json({ error: "verificationId required" }, { status: 400 });
  }

  const verification = await prisma.bioVerification.findUnique({
    where: { id: verificationId },
    include: {
      socialAccount: {
        select: { igBio: true, platformUsername: true },
      },
    },
  });

  if (!verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  const bio = verification.socialAccount.igBio ?? "";
  const codeFound = bio.toLowerCase().includes(verification.code.toLowerCase());

  const updated = await prisma.bioVerification.update({
    where: { id: verificationId },
    data: {
      status: codeFound ? "VERIFIED" : "FAILED",
      lastCheckedAt: new Date(),
      verifiedAt: codeFound ? new Date() : null,
    },
  });

  return NextResponse.json({
    status: updated.status,
    bio: bio || null,
    username: verification.socialAccount.platformUsername,
  });
}
