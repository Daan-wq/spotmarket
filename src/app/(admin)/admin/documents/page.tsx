import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import { prisma } from "@/lib/prisma";
import { DocumentForm } from "./document-form";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [documents, brands, campaigns] = await Promise.all([
    prisma.contractDocument.findMany({
      orderBy: [{ expiresAt: "asc" }, { updatedAt: "desc" }],
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      take: 200,
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 200 }),
    prisma.campaign.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true }, take: 200 }),
  ]);

  const nowTime = new Date().getTime();
  const expiringSoon = documents.filter((document) => {
    if (!document.expiresAt) return false;
    const days = (document.expiresAt.getTime() - nowTime) / (24 * 60 * 60 * 1000);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Admin"
        title="Documents"
        description="Track contracts, briefs, renewal dates, owners, and document links for brand and campaign work."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Tracked documents" value={String(documents.length)} detail="Contracts, briefs, invoices, and rights files" />
        <StatCard label="Need renewal" value={String(expiringSoon.length)} detail="Expiry date in the next 30 days" tone={expiringSoon.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Active contracts" value={String(documents.filter((doc) => doc.status === "ACTIVE").length)} detail="Ready for current work" />
      </div>

      <section>
        <SectionHeader title="Add document" description="Save the status, owner, renewal date, and link or upload metadata." />
        <DocumentForm brands={brands} campaigns={campaigns} />
      </section>

      <section>
        <SectionHeader title="Document tracker" description="Use this list to see what is signed, waiting, expiring, or linked to active work." />
        <DataTable
          rows={documents}
          rowKey={(document) => document.id}
          emptyState={<EmptyState title="No documents tracked yet" description="Add a contract or brief above to start the document tracker." />}
          columns={[
            { key: "title", header: "Document", cell: (document) => <span className="font-semibold text-neutral-950">{document.title}</span> },
            { key: "status", header: "Status", cell: (document) => <Badge variant={document.status === "ACTIVE" ? "verified" : document.status === "EXPIRED" ? "failed" : "pending"}>{titleCaseEnum(document.status)}</Badge> },
            { key: "owner", header: "Owner", cell: (document) => document.owner || "-" },
            { key: "brand", header: "Brand", cell: (document) => document.brand?.name ?? "-" },
            { key: "campaign", header: "Campaign", cell: (document) => document.campaign?.name ?? "-" },
            { key: "expiry", header: "Expiry", cell: (document) => formatDate(document.expiresAt) },
            { key: "renewal", header: "Renewal", cell: (document) => formatDate(document.renewalAt) },
            { key: "link", header: "Link", cell: (document) => document.externalUrl ? <a className="font-medium text-neutral-950 underline" href={document.externalUrl} target="_blank" rel="noreferrer">Open</a> : document.fileName || "-" },
          ]}
        />
      </section>
    </div>
  );
}
