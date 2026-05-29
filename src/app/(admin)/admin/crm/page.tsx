import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { LeadCreateForm } from "./lead-create-form";
import { LeadTable, type LeadTableLead } from "./lead-table";

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
  const grouped = new Map<string, { name: string; owner: string | null; leads: LeadTableLead[] }>();
  const ungrouped: LeadTableLead[] = [];
  const categories = new Set(leads.map((lead) => lead.category).filter(Boolean));

  for (const lead of leads) {
    if (!lead.leadGroup) {
      ungrouped.push(lead);
      continue;
    }
    const group = grouped.get(lead.leadGroup.id) ?? {
      name: lead.leadGroup.name,
      owner: lead.leadGroup.owner,
      leads: [],
    };
    group.leads.push(lead);
    grouped.set(lead.leadGroup.id, group);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sales"
        title="Leaddatabase"
        description="Bedrijven, groepen, categorieen, contacten en notities in een eenvoudige tabel."
      />

      <section className="flex justify-end">
        <LeadCreateForm />
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DatabaseMetric label="Leads" value={leads.length} />
        <DatabaseMetric label="Groepen" value={grouped.size} />
        <DatabaseMetric label="Categorieen" value={categories.size} />
      </div>

      <section>
        <SectionHeader title="Leadtabel" />
        {leads.length === 0 ? (
          <EmptyState title="Nog geen leads" description="Voeg het eerste bedrijf of contact toe via de knop hierboven." />
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([id, group]) => (
              <details key={id} open className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <summary className="cursor-pointer border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{group.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {group.owner ? `${group.owner} / ` : ""}
                      {group.leads.length} {group.leads.length === 1 ? "lead" : "leads"}
                    </p>
                  </div>
                </summary>
                <LeadTable groupName={group.name} leads={group.leads} />
              </details>
            ))}

            {ungrouped.length > 0 ? (
              <details open className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <summary className="cursor-pointer border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">Ongegroepeerd</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {ungrouped.length} {ungrouped.length === 1 ? "lead" : "leads"}
                    </p>
                  </div>
                </summary>
                <LeadTable groupName="Ongegroepeerd" leads={ungrouped} />
              </details>
            ) : null}
          </div>
        )}
      </section>
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
    owner: lead.owner,
    notes: lead.notes,
  };
}
