import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import VerificationActions from "./_components/verification-actions";

export default async function VerificationsPage() {
  const connections = await prisma.creatorIgConnection.findMany({
    include: {
      creatorProfile: { select: { displayName: true } },
      bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const verified = connections.filter((connection) => connection.isVerified).length;
  const pending = connections.filter((connection) => !connection.isVerified && connection.bioVerifications[0]?.status !== "FAILED").length;
  const failed = connections.filter((connection) => connection.bioVerifications[0]?.status === "FAILED").length;

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Verificaties"
        title="Verificaties"
        description="Review de Instagram-verificatiestatus van creators en grijp alleen in wanneer nodig."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Geverifieerd" value={String(verified)} detail="Accounts klaar" />
        <StatCard label="In behandeling" value={String(pending)} detail="Wacht op beslissing" tone={pending > 0 ? "warning" : "neutral"} />
        <StatCard label="Mislukt" value={String(failed)} detail="Afgewezen bewijzen" tone={failed > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Verificatietabel" description="Actieknoppen openen vanuit de beheerdrawer." />
        <DataTable
          rows={connections}
          rowKey={(connection) => connection.id}
          emptyState={<EmptyState title="Nog geen verificatierecords" description="Instagramkoppelingen verschijnen hier zodra creators accounts gaan koppelen." />}
          columns={[
            { key: "creator", header: "Creator", cell: (connection) => connection.creatorProfile.displayName },
            { key: "username", header: "IG-gebruikersnaam", cell: (connection) => connection.igUsername },
            {
              key: "status",
              header: "Status",
              cell: (connection) => {
                const bio = connection.bioVerifications[0];
                const label = connection.isVerified ? "VERIFIED" : bio?.status || "PENDING";
                return <Badge variant={connection.isVerified ? "verified" : bio?.status === "FAILED" ? "failed" : "pending"}>{titleCaseEnum(label)}</Badge>;
              },
            },
            { key: "checked", header: "Laatste bewijs", cell: (connection) => formatDate(connection.bioVerifications[0]?.createdAt) },
            {
              key: "actions",
              header: "Acties",
              cell: (connection) => (
                <ProgressiveActionDrawer
                  triggerLabel="Beheren"
                  title={connection.igUsername}
                  description="Verificatiebeslissing"
                  variant="outline"
                  size="sm"
                  showIcon={false}
                >
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <VerificationActions id={connection.id} isVerified={connection.isVerified} />
                  </div>
                </ProgressiveActionDrawer>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
