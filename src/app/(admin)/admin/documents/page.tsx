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
        title="Documenten"
        description="Volg contracten, briefs, verlengdatums, eigenaren en documentlinks voor merk- en campagnewerk."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Bijgehouden documenten" value={String(documents.length)} detail="Contracten, briefs, facturen en rechtenbestanden" />
        <StatCard label="Moeten verlengd worden" value={String(expiringSoon.length)} detail="Vervaldatum binnen 30 dagen" tone={expiringSoon.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Actieve contracten" value={String(documents.filter((doc) => doc.status === "ACTIVE").length)} detail="Klaar voor huidig werk" />
      </div>

      <section>
        <SectionHeader title="Document toevoegen" description="Sla status, eigenaar, verlengdatum en link of uploadmetadata op." />
        <DocumentForm brands={brands} campaigns={campaigns} />
      </section>

      <section>
        <SectionHeader title="Documenttracker" description="Gebruik deze lijst om te zien wat getekend is, wacht, verloopt of gekoppeld is aan actief werk." />
        <DataTable
          rows={documents}
          rowKey={(document) => document.id}
          emptyState={<EmptyState title="Nog geen documenten bijgehouden" description="Voeg hierboven een contract of brief toe om de documenttracker te starten." />}
          columns={[
            { key: "title", header: "Document", cell: (document) => <span className="font-semibold text-neutral-950">{document.title}</span> },
            { key: "status", header: "Status", cell: (document) => <Badge variant={document.status === "ACTIVE" ? "verified" : document.status === "EXPIRED" ? "failed" : "pending"}>{titleCaseEnum(document.status)}</Badge> },
            { key: "owner", header: "Eigenaar", cell: (document) => document.owner || "-" },
            { key: "brand", header: "Merk", cell: (document) => document.brand?.name ?? "-" },
            { key: "campaign", header: "Campagne", cell: (document) => document.campaign?.name ?? "-" },
            { key: "expiry", header: "Expiry", cell: (document) => formatDate(document.expiresAt) },
            { key: "renewal", header: "Renewal", cell: (document) => formatDate(document.renewalAt) },
            { key: "link", header: "Link", cell: (document) => document.externalUrl ? <a className="font-medium text-neutral-950 underline" href={document.externalUrl} target="_blank" rel="noreferrer">Openen</a> : document.fileName || "-" },
          ]}
        />
      </section>
    </div>
  );
}
