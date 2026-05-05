import Link from "next/link";
import { Plus } from "@/components/animate-ui/icons/plus";
import { RotateCw } from "@/components/animate-ui/icons/rotate-cw";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, titleCaseEnum } from "@/lib/admin/agency-format";
import { LeadCreateForm } from "./lead-create-form";

export const dynamic = "force-dynamic";

const STAGES = [
  "LEAD",
  "CONTACTED",
  "REPLIED",
  "CALL_BOOKED",
  "CALL_DONE",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
  "NURTURE_LATER",
] as const;

export default async function CrmPage() {
  const now = new Date();
  const [leads, totals] = await Promise.all([
    prisma.brandLead.findMany({
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 100,
      include: { convertedBrand: { select: { id: true, name: true } } },
    }),
    prisma.brandLead.aggregate({
      where: { convertedBrandId: null, stage: { notIn: ["WON", "LOST"] } },
      _sum: { estimatedValue: true },
      _avg: { probability: true },
    }),
  ]);

  const due = leads.filter((lead) => lead.nextFollowUpAt && lead.nextFollowUpAt <= now && !["WON", "LOST"].includes(lead.stage));
  const inPipeline = leads.filter((lead) => !lead.convertedBrandId && !["WON", "LOST"].includes(lead.stage));
  const won = leads.filter((lead) => lead.stage === "WON" || lead.convertedBrandId);

  const counts = new Map(STAGES.map((stage) => [stage, leads.filter((lead) => lead.stage === stage).length]));

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Sales"
        title="Leads"
        description="Lead pipeline, owners, value, probability, and follow-ups. This feeds the command center."
        actions={[{ label: "Create lead", href: "/admin/crm?new=1", icon: Plus }]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Open pipeline" value={String(inPipeline.length)} detail="Not won or lost" />
        <StatCard label="Pipeline value" value={formatCurrency(totals._sum.estimatedValue)} detail="Weighted manually by probability" />
        <StatCard label="Follow-ups due" value={String(due.length)} detail="Visible in command center" tone={due.length > 0 ? "warning" : "neutral"} />
        <StatCard label="Won leads" value={String(won.length)} detail="Converted into brands" />
      </div>

      <section>
        <SectionHeader title="Create lead" description="Add a brand lead and the next follow-up date in one step." />
        <LeadCreateForm />
      </section>

      <section>
        <SectionHeader
          title="Follow-Up Queue"
          description="Only leads with a due or overdue next follow-up."
        />
        {due.length === 0 ? (
          <EmptyState
            title="No lead follow-ups due"
            description="Add next follow-up dates to leads so the command center can tell the operator what to do first."
          />
        ) : (
          <DataTable
            rows={due}
            rowKey={(lead) => lead.id}
            columns={[
              { key: "brand", header: "Brand", cell: (lead) => <LeadName lead={lead} /> },
              { key: "stage", header: "Stage", cell: (lead) => <Badge variant="neutral">{titleCaseEnum(lead.stage)}</Badge> },
              { key: "owner", header: "Owner", cell: (lead) => lead.owner || "-" },
              { key: "value", header: "Value", align: "right", cell: (lead) => formatCurrency(lead.estimatedValue) },
              { key: "next", header: "Next follow-up", cell: (lead) => formatDate(lead.nextFollowUpAt) },
            ]}
          />
        )}
      </section>

      <section>
        <SectionHeader title="Lead list" description="Full lead list, including won, lost, and nurture-later records." />
        <DataTable
          rows={leads}
          rowKey={(lead) => lead.id}
          emptyState={<EmptyState title="No brand leads yet" description="Create the first lead above so follow-ups can appear in the command center." />}
          columns={[
            { key: "brand", header: "Brand", cell: (lead) => <LeadName lead={lead} /> },
            { key: "contact", header: "Contact", cell: (lead) => lead.contactEmail || lead.contactName || "-" },
            { key: "stage", header: "Stage", cell: (lead) => <Badge variant={lead.stage === "WON" ? "verified" : lead.stage === "LOST" ? "failed" : "neutral"}>{titleCaseEnum(lead.stage)}</Badge> },
            { key: "priority", header: "Priority", cell: (lead) => <Badge variant={lead.priority === "HIGH" ? "pending" : "neutral"}>{titleCaseEnum(lead.priority)}</Badge> },
            { key: "value", header: "Value", align: "right", cell: (lead) => formatCurrency(lead.estimatedValue) },
            { key: "prob", header: "Prob.", align: "right", cell: (lead) => `${lead.probability}%` },
            { key: "next", header: "Next follow-up", cell: (lead) => formatDate(lead.nextFollowUpAt) },
            {
              key: "converted",
              header: "Brand",
              cell: (lead) => lead.convertedBrand ? (
                <Link href={`/admin/brands?focus=${lead.convertedBrand.id}`} className="text-sm font-semibold text-neutral-950 underline underline-offset-2">
                  {lead.convertedBrand.name}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
                  <RotateCw className="h-3 w-3" />
                  Open
                </span>
              ),
            },
          ]}
        />
      </section>

      <section>
        <SectionHeader title="Stage counts" description="Simple count of where leads sit today." />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(stage)}</p>
              <p className="mt-3 text-2xl font-semibold text-neutral-950">{counts.get(stage) ?? 0}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LeadName({ lead }: { lead: { brandName: string; source: string | null; notes: string | null } }) {
  return (
    <div>
      <p className="font-semibold text-neutral-950">{lead.brandName}</p>
      <p className="mt-1 text-xs text-neutral-500">{lead.source || lead.notes || "No source noted"}</p>
    </div>
  );
}
