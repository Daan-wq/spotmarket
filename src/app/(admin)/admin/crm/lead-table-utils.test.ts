import { describe, expect, it } from "vitest";
import { DEFAULT_LEAD_FILTERS, filterAndSortLeads, groupLeads, type LeadTableLead } from "./lead-table-utils";

const baseLead: LeadTableLead = {
  id: "lead-1",
  brandName: "Alpha Agency",
  leadGroupId: null,
  leadGroup: null,
  category: "Agency",
  subcategory: "PPC",
  contactName: "Solomon",
  contactEmail: "solomon@example.com",
  contactPhone: null,
  contactLinkedIn: null,
  website: "alpha.example",
  source: null,
  conversionBlocker: "Wacht op reactie",
  stage: "LEAD",
  owner: "Daan",
  nextAction: "Bel morgen",
  nextFollowUpAt: "2026-06-02T00:00:00.000Z",
  notes: "Warm contact",
  convertedBrandId: null,
  archivedAt: null,
  updatedAt: "2026-05-30T10:00:00.000Z",
};

describe("lead table filtering", () => {
  it("shows only active leads by default", () => {
    const leads = [
      baseLead,
      { ...baseLead, id: "lead-2", brandName: "Converted", stage: "WON", convertedBrandId: "brand-1" },
      { ...baseLead, id: "lead-3", brandName: "Archived", archivedAt: "2026-05-30T11:00:00.000Z" },
    ];

    expect(filterAndSortLeads(leads, DEFAULT_LEAD_FILTERS).map((lead) => lead.id)).toEqual(["lead-1"]);
    expect(filterAndSortLeads(leads, { ...DEFAULT_LEAD_FILTERS, view: "converted" }).map((lead) => lead.id)).toEqual(["lead-2"]);
    expect(filterAndSortLeads(leads, { ...DEFAULT_LEAD_FILTERS, view: "archived" }).map((lead) => lead.id)).toEqual(["lead-3"]);
  });

  it("filters by status, blocker, group, category, owner, and query", () => {
    const groupedLead = {
      ...baseLead,
      id: "lead-2",
      brandName: "Beta Podcast",
      leadGroupId: "group-1",
      leadGroup: { id: "group-1", name: "Solomon cluster", owner: "Solomon", notes: null },
      category: "Podcast",
      conversionBlocker: "Budget/prijs",
      stage: "NEGOTIATION",
      owner: null,
      notes: "Needs pricing",
    };

    const result = filterAndSortLeads([baseLead, groupedLead], {
      ...DEFAULT_LEAD_FILTERS,
      query: "pricing",
      status: "NEGOTIATION",
      blocker: "Budget/prijs",
      group: "Solomon cluster",
      category: "Podcast",
      owner: "Solomon",
    });

    expect(result.map((lead) => lead.id)).toEqual(["lead-2"]);
  });

  it("sorts by follow-up date with empty dates last", () => {
    const leads = [
      { ...baseLead, id: "lead-1", nextFollowUpAt: "2026-06-04T00:00:00.000Z" },
      { ...baseLead, id: "lead-2", nextFollowUpAt: null },
      { ...baseLead, id: "lead-3", nextFollowUpAt: "2026-06-01T00:00:00.000Z" },
    ];

    expect(filterAndSortLeads(leads, { ...DEFAULT_LEAD_FILTERS, sort: "followUp" }).map((lead) => lead.id)).toEqual([
      "lead-3",
      "lead-1",
      "lead-2",
    ]);
  });

  it("groups leads by lead group with ungrouped fallback", () => {
    const groupedLead = {
      ...baseLead,
      id: "lead-2",
      leadGroupId: "group-1",
      leadGroup: { id: "group-1", name: "Solomon cluster", owner: "Solomon", notes: null },
    };

    expect(groupLeads([baseLead, groupedLead]).map((group) => group.name)).toEqual(["Ongegroepeerd", "Solomon cluster"]);
  });
});
