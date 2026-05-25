import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { recomputeOpenAntiBotSignals } from "@/lib/metrics/anti-bot-signal";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsedLimit = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 200;
  const result = await recomputeOpenAntiBotSignals({ limit });
  return NextResponse.json({ success: true, ...result });
}

export const POST = GET;
