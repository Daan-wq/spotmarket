import Link from "next/link";
import { Plus } from "@/components/animate-ui/icons/plus";
import { RotateCw } from "@/components/animate-ui/icons/rotate-cw";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionHeader, StatCard } from "@/components/ui/page";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, titleCaseEnum } from "@/lib/admin/agency-format";

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
        title="CRM"
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
        <SectionHeader
          title="Follow-Up Queue"
          description="Only leads with a due or overdue next follow-up."
          action={
            <ProgressiveActionDrawer
              triggerLabel="Stage board"
              title="Stage board"
              description="Compact scan of the sales motion."
              variant="outline"
              width="lg"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {STAGES.map((stage) => (
                  <div key={stage} className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{titleCaseEnum(stage)}</p>
                    <p className="mt-3 text-2xl font-semibold text-neutral-950">{counts.get(stage) ?? 0}</p>
                  </div>
                ))}
              </div>
            </ProgressiveActionDrawer>
          }
        />
        {due.length === 0 ? (
          <EmptyState
            title="No CRM follow-ups due"
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
        <SectionHeader title="Lead List" description="Full CRM list, including won, lost, and nurture-later records." />
        <DataTable
          rows={leads}
          rowKey={(lead) => lead.id}
          emptyState={<EmptyState title="No brand leads yet" description="Create the first lead through the CRM API or seed import; the module is ready for real records." />}
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
