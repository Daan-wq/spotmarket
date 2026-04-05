import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplyButton } from "./_components/apply-button";
import { notFound } from "next/navigation";

export default async function CampaignDetailPage({
  params,
}: {
  params: { campaignId: string };
}) {
  const { userId } = await requireAuth("creator");

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.campaignId },
  });
  if (!campaign || campaign.status !== "active") notFound();

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true, discordId: true },
  });
  if (!user) throw new Error("User not found");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) throw new Error("Creator profile not found");

  const igConnection = await prisma.creatorIgConnection.findUnique({
    where: { creatorProfileId: profile.id },
  });
  const isVerified = igConnection?.isVerified ?? false;

  const existingApplication = await prisma.campaignApplication.findFirst({
    where: {
      campaignId: params.campaignId,
      creatorProfileId: profile.id,
    },
  });

  const hasDiscord = !!user.discordId;
  const canApply = isVerified && !existingApplication && hasDiscord;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        {campaign.name}
      </h1>

      <div
        className="rounded-lg p-6 border mb-6"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-lg mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          {campaign.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              CPV
            </p>
            <p
              style={{ color: "var(--text-primary)" }}
              className="text-2xl font-bold"
            >
              ${Number(campaign.creatorCpv).toFixed(4)}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              Goal Views
            </p>
            <p
              style={{ color: "var(--text-primary)" }}
              className="text-2xl font-bold"
            >
              {campaign.goalViews?.toString() || "N/A"}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              Deadline
            </p>
            <p
              style={{ color: "var(--text-primary)" }}
              className="text-lg font-semibold"
            >
              {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : "N/A"}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)" }} className="text-sm">
              Geo Targets
            </p>
            <p
              style={{ color: "var(--text-primary)" }}
              className="text-lg font-semibold"
            >
              {campaign.targetGeo?.join(", ") || "Global"}
            </p>
          </div>
        </div>

        {campaign.contentGuidelines && (
          <div className="mb-6 border-t" style={{ borderColor: "var(--border)" }}>
            <h3
              className="text-lg font-semibold mt-6 mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Content Guidelines
            </h3>
            <p
              style={{ color: "var(--text-secondary)" }}
              className="whitespace-pre-wrap"
            >
              {campaign.contentGuidelines}
            </p>
          </div>
        )}

        {!isVerified && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              background: "var(--warning-bg)",
              borderColor: "var(--warning)",
            }}
          >
            <p style={{ color: "var(--warning-text)" }}>
              ⚠️ You must verify your Instagram account before applying to campaigns.
            </p>
          </div>
        )}

        {isVerified && !hasDiscord && !existingApplication && (
          <div
            className="p-4 rounded-lg mb-6 flex items-center justify-between"
            style={{
              background: "var(--accent-bg, #eef)",
              border: "1px solid var(--primary, #534AB7)",
            }}
          >
            <p style={{ color: "var(--primary)" }}>
              Connect your Discord account to apply for campaigns.
            </p>
            <a
              href={`/api/auth/discord?return_to=${encodeURIComponent(`/creator/campaigns/${campaign.id}`)}`}
              className="px-4 py-2 rounded-lg font-semibold text-sm"
              style={{ background: "var(--primary)", color: "#fff" }}
            >
              Connect Discord
            </a>
          </div>
        )}

        {existingApplication && (
          <div
            className="p-4 rounded-lg mb-6"
            style={{
              background: "var(--accent-bg)",
              borderColor: "var(--primary)",
            }}
          >
            <p style={{ color: "var(--primary)" }}>
              ✓ You&apos;ve already applied to this campaign.
            </p>
          </div>
        )}

        <ApplyButton campaignId={campaign.id} canApply={canApply} />
      </div>
    </div>
  );
}
