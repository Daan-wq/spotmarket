import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
};

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: "ok" },
      { headers: NO_STORE_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
