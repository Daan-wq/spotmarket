import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { role: true },
  });
  if (user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      report: true,
      applications: {
        where: { status: { in: ["active", "completed"] } },
        include: {
          creatorProfile: { select: { displayName: true, walletAddress: true } },
          payouts: true,
        },
      },
    },
  });

  if (!campaign?.report) {
    return NextResponse.json({ error: "No report found" }, { status: 404 });
  }

  const reportData = campaign.report.dataJson as {
    creators: { creatorProfileId: string; verifiedViews: number; earnings: number }[];
  };

  const rows = [
    ["Creator", "Wallet Address", "Verified Views", "Total Earnings ($)", "Upfront Paid ($)", "Final Payout ($)", "Final Status"],
  ];

  for (const app of campaign.applications) {
    if (!app.creatorProfile) continue;

    const creatorData = reportData.creators.find(
      (c) => c.creatorProfileId === app.creatorProfileId
    );
    const upfront = app.payouts.find((p) => p.type === "upfront");
    const final = app.payouts.find((p) => p.type === "final");

    rows.push([
      app.creatorProfile.displayName,
      app.creatorProfile.walletAddress ?? "",
      String(creatorData?.verifiedViews ?? 0),
      (creatorData?.earnings ?? 0).toFixed(2),
      upfront ? parseFloat(upfront.amount.toString()).toFixed(2) : "0.00",
      final ? parseFloat(final.amount.toString()).toFixed(2) : "0.00",
      final?.status ?? "none",
    ]);
  }

  const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="report-${campaignId}.csv"`,
    },
  });
}
