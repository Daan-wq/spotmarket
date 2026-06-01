import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

const LEGACY_SETTLEMENT_DISABLED_ERROR =
  "Legacy campaign settlement is disabled. Use manual creator payout requests.";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  await requireAuth("admin");
  await params;
  return NextResponse.json(
    { error: LEGACY_SETTLEMENT_DISABLED_ERROR },
    { status: 410 },
  );
}
