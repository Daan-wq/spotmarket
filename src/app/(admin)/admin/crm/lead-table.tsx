"use client";

import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const contactLinkClass = "break-all text-sm font-medium text-neutral-950 underline underline-offset-2";
const inputClass =
  "h-9 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-sm outline-none transition focus:border-neutral-500 disabled:bg-neutral-50";
const textareaClass =
  "min-h-20 w-full rounded-md border border-neutral-200 bg-white px-2.5 py-2 text-sm outline-none transition focus:border-neutral-500 disabled:bg-neutral-50";

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
  owner: string | null;
  notes: string | null;
};

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
  owner: string;
  source: string;
  notes: string;
};

export function LeadTable({ groupName, leads }: { groupName: string; leads: LeadTableLead[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function updateDraft(field: keyof LeadDraft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  function saveLead(leadId: string) {
    if (!draft) return;
    if (!draft.brandName.trim()) {
      setError("Bedrijf of lead is verplicht.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Lead kon niet worden opgeslagen.");
        return;
      }

      setEditingId(null);
      setDraft(null);
      router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1120px] text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            <th className="px-4 py-3 font-semibold">Groep</th>
            <th className="px-4 py-3 font-semibold">Bedrijf / lead</th>
            <th className="px-4 py-3 font-semibold">Categorie</th>
            <th className="px-4 py-3 font-semibold">Subcategorie</th>
            <th className="px-4 py-3 font-semibold">Contactpersoon</th>
            <th className="px-4 py-3 font-semibold">Contactgegevens</th>
            <th className="px-4 py-3 font-semibold">Eigenaar</th>
            <th className="px-4 py-3 font-semibold">Notities</th>
            <th className="px-4 py-3 text-right font-semibold">Bewerken</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) =>
            editingId === lead.id && draft ? (
              <EditRow
                key={lead.id}
                draft={draft}
                error={error}
                isPending={isPending}
                onCancel={cancelEditing}
                onChange={updateDraft}
                onSave={() => saveLead(lead.id)}
              />
            ) : (
              <ReadRow key={lead.id} groupName={lead.leadGroup?.name ?? groupName} lead={lead} onEdit={() => startEditing(lead)} />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReadRow({
  groupName,
  lead,
  onEdit,
}: {
  groupName: string;
  lead: LeadTableLead;
  onEdit: () => void;
}) {
  return (
    <tr className="border-b border-neutral-100 last:border-0">
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
        <p className="line-clamp-3">{[lead.source, lead.notes].filter(Boolean).join(" / ") || "-"}</p>
      </td>
      <td className="px-4 py-3 text-right align-top">
        <button
          type="button"
          aria-label={`Bewerk ${lead.brandName}`}
          title="Lead bewerken"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function EditRow({
  draft,
  error,
  isPending,
  onCancel,
  onChange,
  onSave,
}: {
  draft: LeadDraft;
  error: string | null;
  isPending: boolean;
  onCancel: () => void;
  onChange: (field: keyof LeadDraft, value: string) => void;
  onSave: () => void;
}) {
  return (
    <tr className="border-b border-neutral-100 bg-neutral-50/70 last:border-0">
      <td className="px-4 py-3 align-top">
        <input aria-label="Groep" value={draft.groupName} onChange={(event) => onChange("groupName", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Bedrijf of lead" required value={draft.brandName} onChange={(event) => onChange("brandName", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Website" value={draft.website} onChange={(event) => onChange("website", event.target.value)} className={inputClass} disabled={isPending} />
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <input aria-label="Categorie" value={draft.category} onChange={(event) => onChange("category", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="px-4 py-3 align-top">
        <input aria-label="Subcategorie" value={draft.subcategory} onChange={(event) => onChange("subcategory", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="px-4 py-3 align-top">
        <input aria-label="Contactpersoon" value={draft.contactName} onChange={(event) => onChange("contactName", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Email" type="email" value={draft.contactEmail} onChange={(event) => onChange("contactEmail", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="Telefoon" value={draft.contactPhone} onChange={(event) => onChange("contactPhone", event.target.value)} className={inputClass} disabled={isPending} />
          <input aria-label="LinkedIn" value={draft.contactLinkedIn} onChange={(event) => onChange("contactLinkedIn", event.target.value)} className={inputClass} disabled={isPending} />
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <input aria-label="Eigenaar" value={draft.owner} onChange={(event) => onChange("owner", event.target.value)} className={inputClass} disabled={isPending} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-2">
          <input aria-label="Bron" value={draft.source} onChange={(event) => onChange("source", event.target.value)} className={inputClass} disabled={isPending} />
          <textarea aria-label="Notities" value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} className={textareaClass} disabled={isPending} />
        </div>
      </td>
      <td className="px-4 py-3 text-right align-top">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            aria-label="Lead opslaan"
            title="Lead opslaan"
            onClick={onSave}
            disabled={isPending || !draft.brandName.trim()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950 text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {isPending ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Save className="h-4 w-4" />}
          </button>
          <button
            type="button"
            aria-label="Bewerken annuleren"
            title="Annuleren"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? <p className="mt-2 text-right text-xs text-red-600">{error}</p> : null}
      </td>
    </tr>
  );
}

function ContactDetails({ lead }: { lead: LeadTableLead }) {
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
    owner: lead.owner ?? lead.leadGroup?.owner ?? "",
    source: lead.source ?? "",
    notes: lead.notes ?? "",
  };
}
