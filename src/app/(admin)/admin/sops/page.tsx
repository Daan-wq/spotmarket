import { BookOpen } from "lucide-react";
import { Search } from "@/components/animate-ui/icons/search";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import { GuideForm } from "./guide-form";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "SALES",
  "BRAND_ONBOARDING",
  "CLIPPER_RECRUITMENT",
  "PRODUCTION",
  "QC",
  "PAYOUTS",
  "REPORTING",
] as const;

export default async function SopLibraryPage() {
  const now = new Date();
  const docs = await prisma.sopDocument.findMany({
    orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "desc" }],
    take: 150,
  });

  const needsReview = docs.filter((doc) => doc.status === "NEEDS_REVIEW" || (doc.nextReviewAt && doc.nextReviewAt <= now));
  const active = docs.filter((doc) => doc.status === "ACTIVE");
  const owners = new Set(docs.map((doc) => doc.owner).filter(Boolean));

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Operationele kennis"
        title="Handleidingen"
        description="Doorzoekbare adminbibliotheek voor sales, merkonboarding, clipperrecruitment, productie, clipreview, uitbetalingen en rapportage."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Handleidingen" value={String(docs.length)} detail="Alle opgeslagen handleidingen" />
        <StatCard label="Actief" value={String(active.length)} detail="Actuele operationele procedures" />
        <StatCard label="Review nodig" value={String(needsReview.length)} detail="Voedt het command center" tone={needsReview.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Eigenaren" value={String(owners.size)} detail="Toegewezen reviewers" />
      </div>

      <section>
        <SectionHeader title="Handleiding maken" description="Sla een playbook op dat het team kan reviewen en actueel houden." />
        <GuideForm />
      </section>

      <section>
        <SectionHeader title="Categorieen" description="De bibliotheek volgt de operationele adminflow." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {CATEGORIES.map((category) => (
            <div key={category} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(category)}</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-950">
                {docs.filter((doc) => doc.category === category).length}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Reviewwachtrij" description="Verouderde of expliciet gemarkeerde handleidingen." />
        {needsReview.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="Geen handleidingen hoeven review"
            description="Wanneer een reviewdatum van een handleiding is verstreken, verschijnt die hier en in het command center."
          />
        ) : (
          <DataTable
            rows={needsReview}
            rowKey={(doc) => doc.id}
            columns={[
              { key: "title", header: "Titel", cell: (doc) => <DocTitle doc={doc} /> },
              { key: "category", header: "Categorie", cell: (doc) => titleCaseEnum(doc.category) },
              { key: "owner", header: "Eigenaar", cell: (doc) => doc.owner || "-" },
              { key: "status", header: "Status", cell: (doc) => <Badge variant="pending">{titleCaseEnum(doc.status)}</Badge> },
              { key: "last", header: "Laatst gereviewd", cell: (doc) => formatDate(doc.lastReviewedAt) },
              { key: "next", header: "Volgende review", cell: (doc) => formatDate(doc.nextReviewAt) },
            ]}
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="Handleidingen"
          description="Zoeken en aanmaken kan hier; updates lopen via de adminhandleidingen-API."
        />
        <div className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-500">
          <Search className="h-4 w-4" />
          Doorzoekbare handleidingrecords
        </div>
        <DataTable
          rows={docs}
          rowKey={(doc) => doc.id}
          emptyState={<EmptyState icon={<BookOpen className="h-5 w-5" />} title="Nog geen handleidingen" description="Maak hierboven de eerste handleiding. Categorie, eigenaar, status, inhoud en reviewdatums worden opgeslagen." />}
          columns={[
            { key: "title", header: "Titel", cell: (doc) => <DocTitle doc={doc} /> },
            { key: "category", header: "Categorie", cell: (doc) => titleCaseEnum(doc.category) },
            { key: "owner", header: "Eigenaar", cell: (doc) => doc.owner || "-" },
            { key: "status", header: "Status", cell: (doc) => <Badge variant={doc.status === "ACTIVE" ? "verified" : doc.status === "ARCHIVED" ? "neutral" : "pending"}>{titleCaseEnum(doc.status)}</Badge> },
            { key: "last", header: "Laatst gereviewd", cell: (doc) => formatDate(doc.lastReviewedAt) },
            { key: "next", header: "Volgende review", cell: (doc) => formatDate(doc.nextReviewAt) },
          ]}
        />
      </section>
    </div>
  );
}

function DocTitle({ doc }: { doc: { title: string; summary: string | null } }) {
  return (
    <div>
      <p className="font-semibold text-neutral-950">{doc.title}</p>
      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{doc.summary || "Geen samenvatting"}</p>
    </div>
  );
}
