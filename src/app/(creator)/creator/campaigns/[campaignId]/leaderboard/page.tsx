import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignLeaderboardClient } from "./_components/leaderboard-client";

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignLeaderboardPage({ params }: PageProps) {
  await requireAuth("creator");
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, platform: true, creatorCpv: true },
  });

  if (!campaign) notFound();

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href={`/creator/campaigns/${campaign.id}`}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            &larr; Back to campaign
          </Link>
          <h1
            className="text-2xl font-bold mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {campaign.name} — Leaderboard
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            See how you stack up against other clippers on this campaign. Top
            performers&apos; posts are visible — study what&apos;s working and
            adapt.
          </p>
        </div>
      </div>

      <CampaignLeaderboardClient campaignId={campaign.id} />
    </div>
  );
}
