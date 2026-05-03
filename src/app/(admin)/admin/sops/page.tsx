import { BookOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

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
        eyebrow="Operating Knowledge"
        title="SOP Library"
        description="Searchable admin SOP library for Sales, Brand Onboarding, Clipper Recruitment, Production, QC, Payouts, and Reporting."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Documents" value={String(docs.length)} detail="All SOP records" />
        <StatCard label="Active" value={String(active.length)} detail="Current operating procedures" />
        <StatCard label="Needs review" value={String(needsReview.length)} detail="Feeds command center" tone={needsReview.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Owners" value={String(owners.size)} detail="Assigned reviewers" />
      </div>

      <section>
        <SectionHeader title="Categories" description="The library mirrors the admin operating flow." />
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
        <SectionHeader title="Needs Review Queue" description="Outdated or explicitly flagged SOPs." />
        {needsReview.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No SOPs need review"
            description="When an SOP review date passes, it appears here and in the command center."
          />
        ) : (
          <DataTable
            rows={needsReview}
            rowKey={(doc) => doc.id}
            columns={[
              { key: "title", header: "Title", cell: (doc) => <DocTitle doc={doc} /> },
              { key: "category", header: "Category", cell: (doc) => titleCaseEnum(doc.category) },
              { key: "owner", header: "Owner", cell: (doc) => doc.owner || "-" },
              { key: "status", header: "Status", cell: (doc) => <Badge variant="pending">{titleCaseEnum(doc.status)}</Badge> },
              { key: "last", header: "Last reviewed", cell: (doc) => formatDate(doc.lastReviewedAt) },
              { key: "next", header: "Next review", cell: (doc) => formatDate(doc.nextReviewAt) },
            ]}
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="SOP Documents"
          description="Search is ready for the UI layer; API supports creating and updating documents."
        />
        <div className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-500">
          <Search className="h-4 w-4" />
          Searchable via API
        </div>
        <DataTable
          rows={docs}
          rowKey={(doc) => doc.id}
          emptyState={<EmptyState icon={<BookOpen className="h-5 w-5" />} title="No SOP documents yet" description="Add SOPs through the admin API. Categories, owner, status, body, and review dates are DB-backed now." />}
          columns={[
            { key: "title", header: "Title", cell: (doc) => <DocTitle doc={doc} /> },
            { key: "category", header: "Category", cell: (doc) => titleCaseEnum(doc.category) },
            { key: "owner", header: "Owner", cell: (doc) => doc.owner || "-" },
            { key: "status", header: "Status", cell: (doc) => <Badge variant={doc.status === "ACTIVE" ? "verified" : doc.status === "ARCHIVED" ? "neutral" : "pending"}>{titleCaseEnum(doc.status)}</Badge> },
            { key: "last", header: "Last reviewed", cell: (doc) => formatDate(doc.lastReviewedAt) },
            { key: "next", header: "Next review", cell: (doc) => formatDate(doc.nextReviewAt) },
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
      <p className="mt-1 line-clamp-1 text-xs text-neutral-500">{doc.summary || "No summary"}</p>
    </div>
  );
}
