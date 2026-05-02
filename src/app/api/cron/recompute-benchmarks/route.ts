import { NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { recomputeAllCampaignBenchmarks } from "@/lib/benchmarks/campaign-benchmark";

/**
 * Every-6h cron — recompute rolling p10/p50/p90 benchmarks for every
 * active campaign with submissions, write `CampaignBenchmark` rows, and
 * publish `campaign.benchmark.recomputed` for each.
 *
 * Schedule: 0 *\/6 * * * (defined in vercel.json).
 */
export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recomputeAllCampaignBenchmarks();
  return NextResponse.json({ success: true, ...result });
}

export const GET = POST;
