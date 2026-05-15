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
        eyebrow="Verifications"
        title="Verifications"
        description="Review creator Instagram verification status and take action only when needed."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Verified" value={String(verified)} detail="Ready accounts" />
        <StatCard label="Pending" value={String(pending)} detail="Awaiting decision" tone={pending > 0 ? "warning" : "neutral"} />
        <StatCard label="Failed" value={String(failed)} detail="Rejected proofs" tone={failed > 0 ? "danger" : "neutral"} />
      </div>

      <section>
        <SectionHeader title="Verification Table" description="Action controls open from the Manage drawer." />
        <DataTable
          rows={connections}
          rowKey={(connection) => connection.id}
          emptyState={<EmptyState title="No verification records yet" description="Instagram connections will appear here after creators start connecting accounts." />}
          columns={[
            { key: "creator", header: "Creator", cell: (connection) => connection.creatorProfile.displayName },
            { key: "username", header: "IG username", cell: (connection) => connection.igUsername },
            {
              key: "status",
              header: "Status",
              cell: (connection) => {
                const bio = connection.bioVerifications[0];
                const label = connection.isVerified ? "VERIFIED" : bio?.status || "PENDING";
                return <Badge variant={connection.isVerified ? "verified" : bio?.status === "FAILED" ? "failed" : "pending"}>{titleCaseEnum(label)}</Badge>;
              },
            },
            { key: "checked", header: "Last proof", cell: (connection) => formatDate(connection.bioVerifications[0]?.createdAt) },
            {
              key: "actions",
              header: "Actions",
              cell: (connection) => (
                <ProgressiveActionDrawer
                  triggerLabel="Manage"
                  title={connection.igUsername}
                  description="Verification decision"
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
