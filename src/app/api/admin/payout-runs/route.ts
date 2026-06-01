import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";

const PAYOUT_RUNS_DISABLED_ERROR =
  "Payout runs are disabled. Use manual creator payout requests.";

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const url = new URL(req.url);
    const runs = await prisma.payoutRun.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: { include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } } } },
      take: 200,
    });

    if (url.searchParams.get("format") === "csv") {
      const rows = [
        ["run", "status", "period_start", "period_end", "creator", "email", "clips", "bonus", "deduction", "total"].join(","),
        ...runs.flatMap((run) =>
          run.items.map((item) =>
            [
              csv(run.name),
              run.status,
              run.periodStart.toISOString(),
              run.periodEnd.toISOString(),
              csv(item.creatorProfile?.displayName ?? ""),
              csv(item.creatorProfile?.user?.email ?? ""),
              item.approvedClips,
              item.bonus,
              item.deduction,
              item.total,
            ].join(","),
          ),
        ),
      ];
      return new NextResponse(rows.join("\n"), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=clipprofit-payout-runs.csv",
        },
      });
    }

    return NextResponse.json(serialize(runs));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/payout-runs]");
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth("admin");
    await req.json().catch(() => ({}));
    return NextResponse.json(
      { error: PAYOUT_RUNS_DISABLED_ERROR },
      { status: 410 },
    );
  } catch (error) {
    return jsonError(error, "[POST /api/admin/payout-runs]");
  }
}

function csv(value: unknown) {
  const raw = String(value ?? "");
  return `"${raw.replaceAll('"', '""')}"`;
}
