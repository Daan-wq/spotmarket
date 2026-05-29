import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { LeadCreateForm } from "./lead-create-form";

export const dynamic = "force-dynamic";

const contactLinkClass = "break-all text-sm font-medium text-neutral-950 underline underline-offset-2";

async function loadLeads() {
  return prisma.brandLead.findMany({
    orderBy: [{ leadGroup: { name: "asc" } }, { brandName: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: { leadGroup: true },
  });
}

type LeadRow = Awaited<ReturnType<typeof loadLeads>>[number];

export default async function CrmPage() {
  const leads = await loadLeads();
  const grouped = new Map<string, { name: string; owner: string | null; leads: LeadRow[] }>();
  const ungrouped: LeadRow[] = [];
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
        title="Lead database"
        description="Companies, groups, categories, contacts, and notes in one simple table."
      />

      <section>
        <SectionHeader title="Add lead" />
        <LeadCreateForm />
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <DatabaseMetric label="Leads" value={leads.length} />
        <DatabaseMetric label="Groups" value={grouped.size} />
        <DatabaseMetric label="Categories" value={categories.size} />
      </div>

      <section>
        <SectionHeader title="Lead table" />
        {leads.length === 0 ? (
          <EmptyState title="No leads yet" description="Add the first company or contact above." />
        ) : (
          <div className="space-y-3">
            {Array.from(grouped.entries()).map(([id, group]) => (
              <details key={id} open className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <summary className="cursor-pointer border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">{group.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {group.owner ? `${group.owner} · ` : ""}
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
                    <p className="text-sm font-semibold text-neutral-950">Ungrouped</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {ungrouped.length} {ungrouped.length === 1 ? "lead" : "leads"}
                    </p>
                  </div>
                </summary>
                <LeadTable groupName="Ungrouped" leads={ungrouped} />
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

function LeadTable({ groupName, leads }: { groupName: string; leads: LeadRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            <th className="px-4 py-3 font-semibold">Group</th>
            <th className="px-4 py-3 font-semibold">Company / lead</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Subcategory</th>
            <th className="px-4 py-3 font-semibold">Contact person</th>
            <th className="px-4 py-3 font-semibold">Contact details</th>
            <th className="px-4 py-3 font-semibold">Owner</th>
            <th className="px-4 py-3 font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-neutral-100 last:border-0">
              <td className="px-4 py-3 align-top text-neutral-500">{groupName}</td>
              <td className="px-4 py-3 align-top">
                <p className="font-semibold text-neutral-950">{lead.brandName}</p>
                {lead.website ? <ContactLink href={lead.website} label={lead.website} /> : null}
              </td>
              <td className="px-4 py-3 align-top text-neutral-700">{lead.category || "-"}</td>
              <td className="px-4 py-3 align-top text-neutral-700">{lead.subcategory || "-"}</td>
              <td className="px-4 py-3 align-top text-neutral-700">{lead.contactName || "-"}</td>
              <td className="px-4 py-3 align-top">
                <ContactDetails lead={lead} />
              </td>
              <td className="px-4 py-3 align-top text-neutral-700">{lead.owner || lead.leadGroup?.owner || "-"}</td>
              <td className="max-w-xs px-4 py-3 align-top text-neutral-600">
                <p className="line-clamp-3">{[lead.source, lead.notes].filter(Boolean).join(" · ") || "-"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactDetails({ lead }: { lead: LeadRow }) {
  const items = [
    lead.contactEmail ? <a key="email" href={`mailto:${lead.contactEmail}`} className={contactLinkClass}>{lead.contactEmail}</a> : null,
    lead.contactPhone ? <a key="phone" href={`tel:${lead.contactPhone}`} className={contactLinkClass}>{lead.contactPhone}</a> : null,
    lead.contactLinkedIn ? <ContactLink key="linkedin" href={lead.contactLinkedIn} label={lead.contactLinkedIn} /> : null,
  ].filter(Boolean);

  if (items.length === 0) return <span className="text-neutral-400">-</span>;

  return <div className="flex flex-col items-start gap-1">{items}</div>;
}

function ContactLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={externalHref(href)} target="_blank" rel="noreferrer" className={contactLinkClass}>
      {label}
    </a>
  );
}

function externalHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
