import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth("admin");

    const withdrawals = await prisma.withdrawalRequest.findMany({
      include: {
        wallet: {
          include: {
            user: {
              select: {
                email: true,
                creatorProfile: { select: { displayName: true, tronsAddress: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ withdrawals });
  } catch (err: any) {
    console.error("[admin withdrawals GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
