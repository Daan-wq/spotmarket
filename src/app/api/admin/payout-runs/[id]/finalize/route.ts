import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonError } from "@/lib/admin/agency-api";

const PAYOUT_RUNS_DISABLED_ERROR =
  "Payout runs are disabled. Use manual creator payout requests.";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    await params;
    return NextResponse.json(
      { error: PAYOUT_RUNS_DISABLED_ERROR },
      { status: 410 },
    );
  } catch (error) {
    return jsonError(error, "[POST /api/admin/payout-runs/[id]/finalize]");
  }
}
