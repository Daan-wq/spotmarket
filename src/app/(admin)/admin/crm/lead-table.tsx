"use client";

import { Archive, Building2, Pencil, RotateCcw, Save, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  CONVERSION_BLOCKER_OPTIONS,
  LEAD_STAGE_OPTIONS,
  type LeadStage,
} from "@/lib/admin/crm-leads";
import {
  DEFAULT_LEAD_FILTERS,
  filterAndSortLeads,
  groupLeads,
  leadGroupName,
  leadOwner,
  uniqueLeadValues,
  type LeadFilters,
  type LeadTableLead,
} from "./lead-table-utils";

export type { LeadTableLead } from "./lead-table-utils";

const contactLinkClass = "break-all text-sm font-medium text-neutral-950 underline underline-offset-2";
const inputClass =
  "h-9 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:bg-neutral-50";
const selectClass = `${inputClass} pr-8`;
const textareaClass =
  "min-h-20 w-full min-w-0 rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-neutral-500 disabled:bg-neutral-50";

type LeadDraft = {
  groupName: string;
  brandName: string;
  category: string;
  subcategory: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactLinkedIn: string;
  website: string;
  source: string;
  conversionBlocker: string;
  stage: LeadStage;
  owner: string;
  nextAction: string;
  nextFollowUpAt: string;
  notes: string;
};

type ConfirmAction = { type: "archive" | "convert"; lead: LeadTableLead } | null;

export function LeadDatabase({ leads }: { leads: LeadTableLead[] }) {
  const router = useRouter();
  const locale = useLocale();
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_LEAD_FILTERS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const filteredLeads = useMemo(() => filterAndSortLeads(leads, filters), [leads, filters]);
  const groups = useMemo(() => groupLeads(filteredLeads), [filteredLeads]);
  const groupOptions = useMemo(() => uniqueLeadValues(leads, leadGroupName), [leads]);
  const categoryOptions = useMemo(() => uniqueLeadValues(leads, (lead) => lead.category), [leads]);
  const ownerOptions = useMemo(() => uniqueLeadValues(leads, leadOwner), [leads]);

  function setFilter<Key extends keyof LeadFilters>(key: Key, value: LeadFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function startEditing(lead: LeadTableLead) {
    setError(null);
    setEditingId(lead.id);
    setDraft(toDraft(lead));
  }

  function cancelEditing() {
    setError(null);
    setEditingId(null);
    setDraft(null);
  }

  function updateDraft<Key extends keyof LeadDraft>(field: Key, value: LeadDraft[Key]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function patchLead(leadId: string, payload: Record<string, unknown>, busyAction = "patch") {
    setError(null);
    setBusyKey(`${leadId}:${busyAction}`);
    try {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Lead kon niet worden opgeslagen.");
        return false;
      }

      router.refresh();
      return true;
    } finally {
      setBusyKey(null);
    }
  }

  async function saveLead(leadId: string) {
    if (!draft) return;
    if (!draft.brandName.trim()) {
      setError("Bedrijf of lead is verplicht.");
      return;
    }

    const saved = await patchLead(leadId, draft, "save");
    if (saved) {
      setEditingId(null);
      setDraft(null);
    }
  }

  async function updateStatus(lead: LeadTableLead, stage: LeadStage) {
    await patchLead(lead.id, { stage }, "status");
  }

  async function archiveLead(lead: LeadTableLead) {
    setError(null);
    setBusyKey(`${lead.id}:archive`);
    try {
      const response = await fetch(`/api/admin/crm/leads/${lead.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Lead kon niet worden gearchiveerd.");
        return;
      }
      setConfirmAction(null);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  async function restoreLead(lead: LeadTableLead) {
    await patchLead(lead.id, { archivedAt: null }, "restore");
  }

  async function convertLead(lead: LeadTableLead) {
    setError(null);
    setBusyKey(`${lead.id}:convert`);
    try {
      const response = await fetch(`/api/admin/crm/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: lead.category ?? "",
          website: lead.website ?? "",
          accountManager: leadOwner(lead) ?? "",
          packageName: lead.subcategory ?? "",
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Lead kon niet naar Brands worden gezet.");
        return;
      }

      setConfirmAction(null);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-neutral-950">Leadtabel</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Actieve leads staan standaard in beeld. Gebruik filters voor historie, gearchiveerde leads en geconverteerde klanten.
        </p>
      </div>

      <LeadToolbar
        filters={filters}
        groupOptions={groupOptions}
        categoryOptions={categoryOptions}
        ownerOptions={ownerOptions}
        onChange={setFilter}
        onReset={() => setFilters(DEFAULT_LEAD_FILTERS)}
      />

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {leads.length === 0 ? (
        <EmptyTableMessage title="Nog geen leads" description="Voeg het eerste bedrijf of contact toe via de knop hierboven." />
      ) : filteredLeads.length === 0 ? (
        <EmptyTableMessage title="Geen leads gevonden" description="Pas de filters aan om meer leads te tonen." />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <details key={group.id} open className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <summary className="cursor-pointer border-b border-neutral-100 bg-neutral-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-neutral-950">{group.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {group.owner ? `${group.owner} / ` : ""}
                    {group.leads.length} {group.leads.length === 1 ? "lead" : "leads"}
                  </p>
                </div>
              </summary>
              <LeadTable
                leads={group.leads}
                locale={locale}
                editingId={editingId}
                draft={draft}
                busyKey={busyKey}
                onArchive={(lead) => setConfirmAction({ type: "archive", lead })}
                onCancel={cancelEditing}
                onChangeDraft={updateDraft}
                onConvert={(lead) => setConfirmAction({ type: "convert", lead })}
                onEdit={startEditing}
                onRestore={restoreLead}
                onSave={saveLead}
                onStatusChange={updateStatus}
              />
            </details>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction?.type === "archive"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => (confirmAction?.lead ? archiveLead(confirmAction.lead) : undefined)}
        title="Lead archiveren"
        description={
          confirmAction?.lead
            ? `${confirmAction.lead.brandName} verdwijnt uit de actieve leadlijst, maar blijft beschikbaar via de filter Gearchiveerd.`
            : undefined
        }
        confirmLabel="Archiveren"
        variant="destructive"
        pending={Boolean(confirmAction?.lead && busyKey === `${confirmAction.lead.id}:archive`)}
      />

      <ConfirmDialog
        open={confirmAction?.type === "convert"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => (confirmAction?.lead ? convertLead(confirmAction.lead) : undefined)}
        title="Toevoegen aan Brands"
        description={
          confirmAction?.lead
            ? `${confirmAction.lead.brandName} wordt aangemaakt als Brand met onboarding en verdwijnt uit de actieve leads.`
            : undefined
        }
        confirmLabel="Toevoegen"
        pending={Boolean(confirmAction?.lead && busyKey === `${confirmAction.lead.id}:convert`)}
      />
    </section>
  );
}

function LeadToolbar({
  filters,
  groupOptions,
  categoryOptions,
  ownerOptions,
  onChange,
  onReset,
}: {
  filters: LeadFilters;
  groupOptions: string[];
  categoryOptions: string[];
  ownerOptions: string[];
  onChange: <Key extends keyof LeadFilters>(key: Key, value: LeadFilters[Key]) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <input
          value={filters.query}
          onChange={(event) => onChange("query", event.target.value)}
          placeholder="Zoeken"
          className={`${inputClass} md:col-span-2`}
        />
        <ToolbarSelect value={filters.view} onChange={(value) => onChange("view", value as LeadFilters["view"])}>
          <option value="active">Actief</option>
          <option value="converted">Geconverteerd</option>
          <option value="archived">Gearchiveerd</option>
          <option value="all">Alles</option>
        </ToolbarSelect>
        <ToolbarSelect value={filters.status} onChange={(value) => onChange("status", value)}>
          <option value="all">Alle statussen</option>
          {LEAD_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect value={filters.blocker} onChange={(value) => onChange("blocker", value)}>
          <option value="all">Alle redenen</option>
          {CONVERSION_BLOCKER_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect value={filters.group} onChange={(value) => onChange("group", value)}>
          <option value="all">Alle groepen</option>
          {groupOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect value={filters.category} onChange={(value) => onChange("category", value)}>
          <option value="all">Alle categorieen</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect value={filters.owner} onChange={(value) => onChange("owner", value)}>
          <option value="all">Alle eigenaren</option>
          {ownerOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </ToolbarSelect>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <ToolbarSelect value={filters.sort} onChange={(value) => onChange("sort", value as LeadFilters["sort"])} className="max-w-56">
          <option value="updated">Laatst bijgewerkt</option>
          <option value="name">Naam</option>
          <option value="status">Status</option>
          <option value="followUp">Follow-up datum</option>
        </ToolbarSelect>
        <button type="button" onClick={onReset} className="rounded-md px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950">
          Filters wissen
        </button>
      </div>
    </div>
  );
}

function ToolbarSelect({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={`${selectClass} ${className}`}>
      {children}
    </select>
  );
}

function LeadTable({
  leads,
  locale,
  editingId,
  draft,
  busyKey,
  onArchive,
  onCancel,
  onChangeDraft,
  onConvert,
  onEdit,
  onRestore,
  onSave,
  onStatusChange,
}: {
  leads: LeadTableLead[];
  locale: string;
  editingId: string | null;
  draft: LeadDraft | null;
  busyKey: string | null;
  onArchive: (lead: LeadTableLead) => void;
  onCancel: () => void;
  onChangeDraft: <Key extends keyof LeadDraft>(field: Key, value: LeadDraft[Key]) => void;
  onConvert: (lead: LeadTableLead) => void;
  onEdit: (lead: LeadTableLead) => void;
  onRestore: (lead: LeadTableLead) => void;
  onSave: (leadId: string) => void;
  onStatusChange: (lead: LeadTableLead, stage: LeadStage) => void;
}) {
  return (
    <div className="w-full">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[14%]" />
          <col className="w-[8%]" />
          <col className="w-[13%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            <th className="px-3 py-3 font-semibold">Groep</th>
            <th className="px-3 py-3 font-semibold">Status</th>
            <th className="px-3 py-3 font-semibold">Bedrijf / lead</th>
            <th className="px-3 py-3 font-semibold">Reden</th>
            <th className="px-3 py-3 font-semibold">Volgende actie</th>
            <th className="px-3 py-3 font-semibold">Contact</th>
            <th className="px-3 py-3 font-semibold">Eigenaar</th>
            <th className="px-3 py-3 font-semibold">Notities</th>
            <th className="px-3 py-3 text-right font-semibold">Acties</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) =>
            editingId === lead.id && draft ? (
              <EditRow
                key={lead.id}
                draft={draft}
                isPending={Boolean(busyKey?.startsWith(`${lead.id}:`))}
                onCancel={onCancel}
                onChange={onChangeDraft}
                onSave={() => onSave(lead.id)}
              />
            ) : (
              <ReadRow
                key={lead.id}
                lead={lead}
                locale={locale}
                busyKey={busyKey}
                onArchive={() => onArchive(lead)}
                onConvert={() => onConvert(lead)}
                onEdit={() => onEdit(lead)}
                onRestore={() => onRestore(lead)}
                onStatusChange={(stage) => onStatusChange(lead, stage)}
              />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReadRow({
  lead,
  locale,
  busyKey,
  onArchive,
  onConvert,
  onEdit,
  onRestore,
  onStatusChange,
}: {
  lead: LeadTableLead;
  locale: string;
  busyKey: string | null;
  onArchive: () => void;
  onConvert: () => void;
  onEdit: () => void;
  onRestore: () => void;
  onStatusChange: (stage: LeadStage) => void;
}) {
  const isBusy = Boolean(busyKey?.startsWith(`${lead.id}:`));
  const converted = Boolean(lead.convertedBrandId || lead.stage === "WON");

  return (
    <tr className={`border-b border-neutral-100 last:border-0 ${lead.archivedAt ? "bg-neutral-50/70" : ""}`}>
      <td className="min-w-0 break-words px-3 py-3 align-top text-neutral-500">{leadGroupName(lead)}</td>
      <td className="min-w-0 px-3 py-3 align-top">
        <select
          aria-label={`Status voor ${lead.brandName}`}
          value={lead.stage}
          onChange={(event) => onStatusChange(event.target.value as LeadStage)}
          disabled={isBusy}
          className={selectClass}
        >
          {LEAD_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <p className="font-semibold text-neutral-950">{lead.brandName}</p>
        {lead.website ? <ContactLink href={lead.website} label={lead.website} /> : null}
        {converted ? <p className="mt-1 text-xs font-medium text-emerald-700">Staat in Brands</p> : null}
      </td>
      <td className="min-w-0 break-words px-3 py-3 align-top text-neutral-700">{lead.conversionBlocker || "-"}</td>
      <td className="min-w-0 px-3 py-3 align-top text-neutral-700">
        <p className="line-clamp-2">{lead.nextAction || "-"}</p>
        {lead.nextFollowUpAt ? <p className="mt-1 text-xs text-neutral-400">{formatDateDisplay(lead.nextFollowUpAt, locale)}</p> : null}
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <p className="text-neutral-700">{lead.contactName || "-"}</p>
        <ContactDetails lead={lead} />
      </td>
      <td className="min-w-0 break-words px-3 py-3 align-top text-neutral-700">{leadOwner(lead) || "-"}</td>
      <td className="min-w-0 px-3 py-3 align-top text-neutral-600">
        <p className="line-clamp-3">{[lead.source, lead.notes].filter(Boolean).join(" / ") || "-"}</p>
      </td>
      <td className="min-w-0 px-3 py-3 text-right align-top">
        <div className="flex flex-wrap justify-end gap-1">
          <IconButton label={`Bewerk ${lead.brandName}`} onClick={onEdit} disabled={isBusy}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          {!converted && !lead.archivedAt ? (
            <IconButton label={`${lead.brandName} toevoegen aan Brands`} onClick={onConvert} disabled={isBusy}>
              <Building2 className="h-4 w-4" />
            </IconButton>
          ) : null}
          {lead.archivedAt ? (
            <IconButton label={`${lead.brandName} herstellen`} onClick={onRestore} disabled={isBusy}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          ) : (
            <IconButton label={`${lead.brandName} archiveren`} onClick={onArchive} disabled={isBusy}>
              <Archive className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </td>
    </tr>
  );
}

function EditRow({
  draft,
  isPending,
  onCancel,
  onChange,
  onSave,
}: {
  draft: LeadDraft;
  isPending: boolean;
  onCancel: () => void;
  onChange: <Key extends keyof LeadDraft>(field: Key, value: LeadDraft[Key]) => void;
  onSave: () => void;
}) {
  return (
    <tr className="border-b border-neutral-100 bg-neutral-50/70 last:border-0">
      <td className="min-w-0 px-3 py-3 align-top">
        <input aria-label="Groep" value={draft.groupName} onChange={(event) => onChange("groupName", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <select aria-label="Status" value={draft.stage} onChange={(event) => onChange("stage", event.target.value as LeadStage)} className={selectClass} disabled={isPending}>
          {LEAD_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Bedrijf of lead" required value={draft.brandName} onChange={(event) => onChange("brandName", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Website" value={draft.website} onChange={(event) => onChange("website", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Categorie" value={draft.category} onChange={(event) => onChange("category", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Subcategorie" value={draft.subcategory} onChange={(event) => onChange("subcategory", event.target.value)} className={inputClass} disabled={isPending} />
        </div>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <select aria-label="Reden nog geen brand" value={draft.conversionBlocker} onChange={(event) => onChange("conversionBlocker", event.target.value)} className={selectClass} disabled={isPending}>
          <option value="">Geen reden</option>
          {CONVERSION_BLOCKER_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Volgende actie" value={draft.nextAction} onChange={(event) => onChange("nextAction", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Follow-up datum" type="date" value={draft.nextFollowUpAt} onChange={(event) => onChange("nextFollowUpAt", event.target.value)} className={inputClass} disabled={isPending} />
        </div>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Contactpersoon" value={draft.contactName} onChange={(event) => onChange("contactName", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Email" type="email" value={draft.contactEmail} onChange={(event) => onChange("contactEmail", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Telefoon" value={draft.contactPhone} onChange={(event) => onChange("contactPhone", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="LinkedIn" value={draft.contactLinkedIn} onChange={(event) => onChange("contactLinkedIn", event.target.value)} className={inputClass} disabled={isPending} />
        </div>
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <input aria-label="Eigenaar" value={draft.owner} onChange={(event) => onChange("owner", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="min-w-0 px-3 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Bron" value={draft.source} onChange={(event) => onChange("source", event.target.value)} className={inputClass} disabled={isPending} />
          <textarea aria-label="Notities" value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} className={textareaClass} disabled={isPending} />
        </div>
      </td>
      <td className="min-w-0 px-3 py-3 text-right align-top">
        <div className="flex flex-wrap justify-end gap-1">
          <IconButton label="Lead opslaan" onClick={onSave} disabled={isPending || !draft.brandName.trim()} tone="dark">
            {isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Save className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Bewerken annuleren" onClick={onCancel} disabled={isPending}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </td>
    </tr>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "light",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  const className =
    tone === "dark"
      ? "bg-neutral-950 text-white hover:bg-neutral-800 disabled:bg-neutral-300"
      : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950 disabled:opacity-60";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function ContactDetails({ lead }: { lead: LeadTableLead }) {
  const items = [
    lead.contactEmail ? <a key="email" href={`mailto:${lead.contactEmail}`} className={contactLinkClass}>{lead.contactEmail}</a> : null,
    lead.contactPhone ? <a key="phone" href={`tel:${lead.contactPhone}`} className={contactLinkClass}>{lead.contactPhone}</a> : null,
    lead.contactLinkedIn ? <ContactLink key="linkedin" href={lead.contactLinkedIn} label={lead.contactLinkedIn} /> : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return <div className="mt-1 flex flex-col items-start gap-1">{items}</div>;
}

function ContactLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={externalHref(href)} target="_blank" rel="noreferrer" className={contactLinkClass}>
      {label}
    </a>
  );
}

function EmptyTableMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-neutral-950">{title}</p>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
    </div>
  );
}

function externalHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function formatDateDisplay(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateForInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function toDraft(lead: LeadTableLead): LeadDraft {
  return {
    groupName: lead.leadGroup?.name ?? "",
    brandName: lead.brandName,
    category: lead.category ?? "",
    subcategory: lead.subcategory ?? "",
    contactName: lead.contactName ?? "",
    contactEmail: lead.contactEmail ?? "",
    contactPhone: lead.contactPhone ?? "",
    contactLinkedIn: lead.contactLinkedIn ?? "",
    website: lead.website ?? "",
    source: lead.source ?? "",
    conversionBlocker: lead.conversionBlocker ?? "",
    stage: (LEAD_STAGE_OPTIONS.some((option) => option.value === lead.stage) ? lead.stage : "LEAD") as LeadStage,
    owner: lead.owner ?? lead.leadGroup?.owner ?? "",
    nextAction: lead.nextAction ?? "",
    nextFollowUpAt: formatDateForInput(lead.nextFollowUpAt),
    notes: lead.notes ?? "",
  };
}
