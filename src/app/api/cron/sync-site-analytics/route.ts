import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { syncSiteAnalyticsSnapshots } from "@/lib/site-analytics/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncSiteAnalyticsSnapshots();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-site-analytics]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
