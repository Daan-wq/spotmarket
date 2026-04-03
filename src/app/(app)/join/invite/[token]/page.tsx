import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { JoinCampaignClient } from "./join-client";

function toPlain<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => {
      if (typeof v === "bigint") return Number(v);
      if (v !== null && typeof v === "object" && typeof v.toFixed === "function") return Number(v);
      return v;
    }),
  );
}

export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const inviteLink = await prisma.campaignInviteLink.findUnique({
    where: { token },
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          description: true,
          platform: true,
          targetGeo: true,
          creatorCpv: true,
          deadline: true,
          contentGuidelines: true,
          niche: true,
          status: true,
        },
      },
    },
  });

  if (!inviteLink) notFound();

  const isExpired = inviteLink.expiresAt && new Date(inviteLink.expiresAt) < new Date();
  const isMaxed = inviteLink.maxUses !== null && inviteLink.usesCount >= inviteLink.maxUses;

  if (isExpired || isMaxed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-md w-full text-center rounded-xl p-8" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}>
          <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>Link Expired</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            This invite link is no longer valid. Ask the campaign manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <JoinCampaignClient campaign={toPlain(inviteLink.campaign) as unknown as { id: string; name: string; description: string | null; platform: string; targetGeo: string[]; creatorCpv: number; deadline: string; contentGuidelines: string | null; niche: string | null; status: string }} token={token} />;
}
