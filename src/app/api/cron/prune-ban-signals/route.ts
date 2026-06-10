import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!verifyCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.accessSignal.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return NextResponse.json({ ok: true, deleted: result.count });
}
