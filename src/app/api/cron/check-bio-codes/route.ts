import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.bioVerification.findMany({
    where: { status: "PENDING" },
    include: {
      socialAccount: { select: { igBio: true } },
    },
    take: 100,
  });

  let verified = 0;
  let failed = 0;

  for (const v of pending) {
    const bio = v.socialAccount.igBio ?? "";
    const codeFound = bio.toLowerCase().includes(v.code.toLowerCase());

    await prisma.bioVerification.update({
      where: { id: v.id },
      data: {
        status: codeFound ? "VERIFIED" : "FAILED",
        lastCheckedAt: new Date(),
        verifiedAt: codeFound ? new Date() : null,
      },
    });

    if (codeFound) verified++;
    else failed++;
  }

  return NextResponse.json({
    checked: pending.length,
    verified,
    failed,
  });
}
