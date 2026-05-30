import { PageHeader } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { LeadCreateForm } from "./lead-create-form";
import { LeadDatabase, type LeadTableLead } from "./lead-table";

export const dynamic = "force-dynamic";

async function loadLeads() {
  return prisma.brandLead.findMany({
    orderBy: [{ leadGroup: { name: "asc" } }, { brandName: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: { leadGroup: true },
  });
}

export default async function CrmPage() {
  const leads = (await loadLeads()).map(toLeadTableLead);
  const activeLeads = leads.filter((lead) => !lead.archivedAt && !lead.convertedBrandId && lead.stage !== "WON");
  const convertedLeads = leads.filter((lead) => lead.convertedBrandId || lead.stage === "WON");
  const archivedLeads = leads.filter((lead) => lead.archivedAt);

  return (
    <div className="space-y-8 xl:relative xl:left-1/2 xl:w-[calc(100vw-20rem)] xl:max-w-[1680px] xl:-translate-x-1/2">
      <PageHeader
        eyebrow="Sales"
        title="Leaddatabase"
        description="Bedrijven, groepen, categorieen, contacten en notities in een eenvoudige tabel."
      />

      <section className="flex justify-end">
        <LeadCreateForm />
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DatabaseMetric label="Actieve leads" value={activeLeads.length} />
        <DatabaseMetric label="Geconverteerd" value={convertedLeads.length} />
        <DatabaseMetric label="Gearchiveerd" value={archivedLeads.length} />
      </div>

      <LeadDatabase leads={leads} />
    </div>
  );
}

function DatabaseMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function toLeadTableLead(lead: Awaited<ReturnType<typeof loadLeads>>[number]): LeadTableLead {
  return {
    id: lead.id,
    brandName: lead.brandName,
    leadGroupId: lead.leadGroupId,
    leadGroup: lead.leadGroup
      ? {
          id: lead.leadGroup.id,
          name: lead.leadGroup.name,
          owner: lead.leadGroup.owner,
          notes: lead.leadGroup.notes,
        }
      : null,
    category: lead.category,
    subcategory: lead.subcategory,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone,
    contactLinkedIn: lead.contactLinkedIn,
    website: lead.website,
    source: lead.source,
    conversionBlocker: lead.conversionBlocker,
    stage: lead.stage,
    owner: lead.owner,
    nextAction: lead.nextAction,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    notes: lead.notes,
    convertedBrandId: lead.convertedBrandId,
    archivedAt: lead.archivedAt?.toISOString() ?? null,
    updatedAt: lead.updatedAt.toISOString(),
  };
}
