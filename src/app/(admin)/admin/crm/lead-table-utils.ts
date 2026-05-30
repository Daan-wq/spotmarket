import { LEAD_STAGE_OPTIONS } from "@/lib/admin/crm-leads";

export type LeadTableLead = {
  id: string;
  brandName: string;
  leadGroupId: string | null;
  leadGroup: {
    id: string;
    name: string;
    owner: string | null;
    notes: string | null;
  } | null;
  category: string | null;
  subcategory: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLinkedIn: string | null;
  website: string | null;
  source: string | null;
  conversionBlocker: string | null;
  stage: string;
  owner: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
  notes: string | null;
  convertedBrandId: string | null;
  archivedAt: string | null;
  updatedAt: string;
};

export type LeadViewFilter = "active" | "converted" | "archived" | "all";
export type LeadSortKey = "updated" | "name" | "status" | "followUp";

export type LeadFilters = {
  query: string;
  view: LeadViewFilter;
  status: string;
  blocker: string;
  group: string;
  category: string;
  owner: string;
  sort: LeadSortKey;
};

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  query: "",
  view: "active",
  status: "all",
  blocker: "all",
  group: "all",
  category: "all",
  owner: "all",
  sort: "updated",
};

const stageOrder = new Map<string, number>(LEAD_STAGE_OPTIONS.map((option, index) => [option.value, index]));

export function filterAndSortLeads(leads: LeadTableLead[], filters: LeadFilters) {
  const query = filters.query.trim().toLowerCase();

  return leads
    .filter((lead) => matchesView(lead, filters.view))
    .filter((lead) => filters.status === "all" || lead.stage === filters.status)
    .filter((lead) => filters.blocker === "all" || lead.conversionBlocker === filters.blocker)
    .filter((lead) => filters.group === "all" || leadGroupName(lead) === filters.group)
    .filter((lead) => filters.category === "all" || lead.category === filters.category)
    .filter((lead) => filters.owner === "all" || leadOwner(lead) === filters.owner)
    .filter((lead) => !query || searchableLeadText(lead).includes(query))
    .sort((a, b) => compareLeads(a, b, filters.sort));
}

export function groupLeads(leads: LeadTableLead[]) {
  const grouped = new Map<string, { id: string; name: string; owner: string | null; leads: LeadTableLead[] }>();

  for (const lead of leads) {
    const id = lead.leadGroup?.id ?? "__ungrouped";
    const group = grouped.get(id) ?? {
      id,
      name: leadGroupName(lead),
      owner: lead.leadGroup?.owner ?? null,
      leads: [],
    };
    group.leads.push(lead);
    grouped.set(id, group);
  }

  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function uniqueLeadValues(leads: LeadTableLead[], getValue: (lead: LeadTableLead) => string | null | undefined) {
  return Array.from(new Set(leads.map(getValue).filter((value): value is string => Boolean(value)))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function leadGroupName(lead: LeadTableLead) {
  return lead.leadGroup?.name ?? "Ongegroepeerd";
}

export function leadOwner(lead: LeadTableLead) {
  return lead.owner ?? lead.leadGroup?.owner ?? null;
}

function matchesView(lead: LeadTableLead, view: LeadViewFilter) {
  const converted = Boolean(lead.convertedBrandId || lead.stage === "WON");
  const archived = Boolean(lead.archivedAt);

  if (view === "all") return true;
  if (view === "converted") return converted;
  if (view === "archived") return archived;
  return !converted && !archived;
}

function searchableLeadText(lead: LeadTableLead) {
  return [
    lead.brandName,
    lead.contactName,
    lead.contactEmail,
    lead.contactPhone,
    lead.contactLinkedIn,
    lead.website,
    lead.category,
    lead.subcategory,
    lead.source,
    lead.conversionBlocker,
    lead.nextAction,
    lead.notes,
    leadGroupName(lead),
    leadOwner(lead),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function compareLeads(a: LeadTableLead, b: LeadTableLead, sort: LeadSortKey) {
  if (sort === "name") return a.brandName.localeCompare(b.brandName);
  if (sort === "status") return (stageOrder.get(a.stage) ?? 999) - (stageOrder.get(b.stage) ?? 999);
  if (sort === "followUp") return compareNullableDate(a.nextFollowUpAt, b.nextFollowUpAt, "asc");
  return compareNullableDate(a.updatedAt, b.updatedAt, "desc");
}

function compareNullableDate(a: string | null, b: string | null, direction: "asc" | "desc") {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const diff = new Date(a).getTime() - new Date(b).getTime();
  return direction === "asc" ? diff : -diff;
}
