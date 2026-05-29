import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import {
  getCreatorAccountStatusCopy,
  hasVerifiedCreatorPlatform,
  type CreatorVerifiedPlatformState,
} from "@/lib/creator-account-status";
import { prisma } from "@/lib/prisma";

export default async function CreatorsPage() {
  const creators = await prisma.creatorProfile.findMany({
    include: {
      igConnections: { select: { isVerified: true, igUsername: true }, where: { isVerified: true }, take: 1 },
      ttConnections: { select: { isVerified: true }, where: { isVerified: true }, take: 1 },
      ytConnections: { select: { isVerified: true }, where: { isVerified: true }, take: 1 },
      fbConnections: { select: { isVerified: true }, where: { isVerified: true }, take: 1 },
      applications: { where: { campaign: { status: "active" } } },
    },
    orderBy: { totalFollowers: "desc" },
  });

  const verified = creators.filter((creator) =>
    hasVerifiedCreatorPlatform(verifiedStateForCreator(creator)),
  ).length;
  const activeCampaignSlots = creators.reduce((sum, creator) => sum + creator.applications.length, 0);
  const totalFollowers = creators.reduce((sum, creator) => sum + creator.totalFollowers, 0);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Creators"
        title="Creators"
        description="Creatoraccounts, verificatiestatus, publieksgrootte en actieve campagneload."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Creators" value={String(creators.length)} detail="Totaal profielen" />
        <StatCard label="Geverifieerde accounts" value={`${verified}/${creators.length || 0}`} detail="OAuth-klare creators" />
        <StatCard label="Volgers" value={totalFollowers.toLocaleString("nl-NL")} detail="Totaal gemeten publiek" />
        <StatCard label="Actieve slots" value={String(activeCampaignSlots)} detail="Actieve campagneaanmeldingen" />
      </div>

      <section>
        <SectionHeader title="Creatortabel" description="Open een creator voor de gedetailleerde operationele weergave." />
        <DataTable
          rows={creators}
          rowKey={(creator) => creator.id}
          emptyState={<EmptyState title="Nog geen creators" description="Creatorprofielen verschijnen hier na onboarding." />}
          columns={[
            {
              key: "name",
              header: "Naam",
              cell: (creator) => (
                <Link href={`/admin/creators/${creator.id}`} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                  {creator.displayName}
                </Link>
              ),
            },
            { key: "ig", header: "Instagram", cell: (creator) => creator.igConnections[0]?.igUsername || "-" },
            {
              key: "verified",
              header: "Geverifieerde accounts",
              cell: (creator) => {
                const state = verifiedStateForCreator(creator);
                const status = getCreatorAccountStatusCopy(state);
                return (
                  <Badge variant={hasVerifiedCreatorPlatform(state) ? "verified" : "pending"}>
                    {status.value}
                  </Badge>
                );
              },
            },
            { key: "followers", header: "Volgers", align: "right", cell: (creator) => creator.totalFollowers.toLocaleString("nl-NL") },
            { key: "active", header: "Actieve campagnes", align: "right", cell: (creator) => creator.applications.length },
          ]}
        />
      </section>
    </div>
  );
}

function verifiedStateForCreator(creator: {
  igConnections: Array<{ isVerified: boolean }>;
  ttConnections: Array<{ isVerified: boolean }>;
  ytConnections: Array<{ isVerified: boolean }>;
  fbConnections: Array<{ isVerified: boolean }>;
}): CreatorVerifiedPlatformState {
  return {
    instagram: creator.igConnections.some((connection) => connection.isVerified),
    tiktok: creator.ttConnections.some((connection) => connection.isVerified),
    youtube: creator.ytConnections.some((connection) => connection.isVerified),
    facebook: creator.fbConnections.some((connection) => connection.isVerified),
  };
}
