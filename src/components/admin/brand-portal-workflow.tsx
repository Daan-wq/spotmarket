"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, FileText, Mail, Plus, RotateCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/admin/agency-format";

export interface BrandPortalWorkflowContact {
  id: string;
  brandId: string;
  email: string;
  name: string | null;
  status: "INVITED" | "ACTIVE" | "REVOKED";
  inviteExpiresAt: string | null;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface BrandPortalWorkflowBrand {
  id: string;
  name: string;
  contactEmail: string | null;
  portalEnabled: boolean;
  portalCreatedAt: string | null;
  contacts: BrandPortalWorkflowContact[];
  campaignsCount: number;
  visibleReportsCount: number;
  finalHiddenReportsCount: number;
  draftReportsCount: number;
  latestVisibleReportId: string | null;
  latestVisibleReportTitle: string | null;
}

interface BrandPortalWorkflowProps {
  brands: BrandPortalWorkflowBrand[];
  compact?: boolean;
}

export function BrandPortalWorkflow({ brands, compact = false }: BrandPortalWorkflowProps) {
  const [rowsById, setRowsById] = useState<Record<string, BrandPortalWorkflowBrand>>(() => {
    return Object.fromEntries(brands.map((brand) => [brand.id, brand]));
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [mailStatus, setMailStatus] = useState<Record<string, boolean>>({});
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => brands.map((brand) => rowsById[brand.id] ?? brand), [brands, rowsById]);

  async function createPortal(brandId: string) {
    setPendingKey(`create:${brandId}`);
    setError(null);
    const response = await fetch(`/api/admin/brands/${brandId}/portal`, { method: "POST" });
    const body = await response.json().catch(() => ({}));
    setPendingKey(null);

    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "/brand toegang aanmaken mislukt.");
      return;
    }

    patchBrand(brandId, {
      portalEnabled: Boolean(body.brand?.portalEnabled),
      portalCreatedAt: body.brand?.portalCreatedAt ?? new Date().toISOString(),
    });
  }

  async function inviteContact(brandId: string, formData: FormData) {
    setPendingKey(`invite:${brandId}`);
    setError(null);
    const response = await fetch(`/api/admin/brands/${brandId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name") || undefined,
      }),
    });
    const body = await response.json().catch(() => ({}));
    setPendingKey(null);

    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Uitnodiging mislukt.");
      return false;
    }

    patchBrand(brandId, {
      portalEnabled: Boolean(body.brand?.portalEnabled ?? true),
      portalCreatedAt: body.brand?.portalCreatedAt ?? rowsById[brandId]?.portalCreatedAt ?? new Date().toISOString(),
      contacts: upsertContact(rowsById[brandId]?.contacts ?? [], body.contact),
    });
    if (body.inviteUrl) setInviteUrls((current) => ({ ...current, [body.contact.id]: body.inviteUrl }));
    if (typeof body.emailSent === "boolean") setMailStatus((current) => ({ ...current, [body.contact.id]: body.emailSent }));
    return true;
  }

  async function revokeContact(brandId: string, contactId: string) {
    setPendingKey(`revoke:${contactId}`);
    setError(null);
    const response = await fetch(`/api/admin/brands/${brandId}/contacts/${contactId}`, {
      method: "DELETE",
    });
    const body = await response.json().catch(() => ({}));
    setPendingKey(null);

    if (!response.ok) {
      setError(typeof body.error === "string" ? body.error : "Toegang intrekken mislukt.");
      return;
    }

    patchBrand(brandId, {
      contacts: upsertContact(rowsById[brandId]?.contacts ?? [], body.contact),
    });
  }

  async function copyInviteUrl(contactId: string) {
    const url = inviteUrls[contactId];
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedContactId(contactId);
    window.setTimeout(() => setCopiedContactId(null), 1600);
  }

  function patchBrand(brandId: string, patch: Partial<BrandPortalWorkflowBrand>) {
    setRowsById((current) => ({
      ...current,
      [brandId]: { ...(current[brandId] ?? brands.find((brand) => brand.id === brandId)!), ...patch },
    }));
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-5 w-5" />}
        title="Nog geen merken"
        description="Zet eerst een CRM-lead om naar een merk. Daarna kun je hier toegang tot /brand aanmaken."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className={compact ? "grid gap-4" : "grid gap-4 xl:grid-cols-2"}>
        {rows.map((brand) => (
          <article key={brand.id} className="rounded-lg border border-neutral-200 bg-white p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-semibold text-neutral-950">{brand.name}</h3>
                  <PortalBadge enabled={brand.portalEnabled} />
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {brand.campaignsCount} campagnes / {brand.visibleReportsCount} zichtbaar / {activeContactCount(brand.contacts)} actieve logins
                </p>
              </div>
              <Link
                href={`/admin/reports?brandId=${brand.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-neutral-300 hover:text-neutral-950"
              >
                <FileText className="h-4 w-4" />
                Rapportages
              </Link>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Stap 1</p>
                <h4 className="mt-2 text-sm font-semibold text-neutral-950">/brand toegang</h4>
                <p className="mt-1 min-h-[40px] text-sm text-neutral-500">
                  {brand.portalEnabled
                    ? `Aangemaakt${brand.portalCreatedAt ? ` op ${formatDate(brand.portalCreatedAt, "nl")}` : ""}.`
                    : "Maak eerst toegang tot /brand aan voor dit merk."}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-3 h-9 rounded-lg"
                  variant={brand.portalEnabled ? "outline" : "default"}
                  onClick={() => createPortal(brand.id)}
                  isPending={pendingKey === `create:${brand.id}`}
                  disabled={brand.portalEnabled}
                >
                  {brand.portalEnabled ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {brand.portalEnabled ? "Aangemaakt" : "Maak /brand aan"}
                </Button>
              </section>

              <section className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Stap 2</p>
                <h4 className="mt-2 text-sm font-semibold text-neutral-950">Invite naar /brand</h4>
                <form
                  className="mt-3 space-y-2"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const form = event.currentTarget;
                    const ok = await inviteContact(brand.id, new FormData(form));
                    if (ok) form.reset();
                  }}
                >
                  <input
                    name="email"
                    type="email"
                    required
                    disabled={!brand.portalEnabled}
                    placeholder={brand.contactEmail ?? "contact@brand.com"}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none disabled:bg-neutral-100 disabled:text-neutral-400 focus:border-neutral-400"
                  />
                  <input
                    name="name"
                    type="text"
                    disabled={!brand.portalEnabled}
                    placeholder="Naam contact"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none disabled:bg-neutral-100 disabled:text-neutral-400 focus:border-neutral-400"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 w-full rounded-lg"
                    isPending={pendingKey === `invite:${brand.id}`}
                    disabled={!brand.portalEnabled}
                  >
                    <Mail className="h-4 w-4" />
                    Invite naar /brand
                  </Button>
                </form>
              </section>

              <section className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Stap 3</p>
                <h4 className="mt-2 text-sm font-semibold text-neutral-950">Rapport publiceren</h4>
                <p className="mt-1 min-h-[40px] text-sm text-neutral-500">
                  {brand.finalHiddenReportsCount > 0
                    ? `${brand.finalHiddenReportsCount} definitieve rapporten staan nog verborgen.`
                    : brand.visibleReportsCount > 0
                      ? `${brand.visibleReportsCount} rapporten zijn zichtbaar voor de brand.`
                      : "Maak een rapport FINAL en zet het daarna zichtbaar."}
                </p>
                {brand.latestVisibleReportId ? (
                  <Link
                    href="/brand"
                    className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-neutral-950 px-3 text-sm font-semibold text-white hover:bg-neutral-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open /brand
                  </Link>
                ) : (
                  <Link
                    href={`/admin/reports?brandId=${brand.id}`}
                    className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 hover:border-neutral-300 hover:text-neutral-950"
                  >
                    <FileText className="h-4 w-4" />
                    Naar rapport
                  </Link>
                )}
              </section>
            </div>

            <div className="mt-5 space-y-2">
              {brand.contacts.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-200 px-3 py-3 text-sm text-neutral-500">
                  Nog geen brandcontacten. Na stap 2 krijgt het contact een mail of invite-link om zelf op /brand in te loggen.
                </p>
              ) : (
                brand.contacts.map((contact) => (
                  <div key={contact.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-neutral-950">{contact.name || contact.email}</p>
                        <ContactStatusBadge status={contact.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-neutral-500">{contact.email}</p>
                      {inviteUrls[contact.id] ? (
                        <div className="mt-2 rounded-lg bg-neutral-50 px-3 py-2">
                          <p className="break-all text-xs text-neutral-600">{inviteUrls[contact.id]}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {mailStatus[contact.id] ? "Mail verzonden." : "Mail niet verzonden in deze omgeving; kopieer de link."}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {inviteUrls[contact.id] ? (
                        <Button type="button" variant="ghost" size="sm" className="h-9 rounded-lg" onClick={() => copyInviteUrl(contact.id)}>
                          <Copy className="h-4 w-4" />
                          {copiedContactId === contact.id ? "Gekopieerd" : "Kopieer"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 rounded-lg"
                        isPending={pendingKey === `invite:${brand.id}`}
                        disabled={!brand.portalEnabled}
                        onClick={() => {
                          const data = new FormData();
                          data.set("email", contact.email);
                          if (contact.name) data.set("name", contact.name);
                          inviteContact(brand.id, data);
                        }}
                      >
                        <RotateCw className="h-4 w-4" />
                        Opnieuw
                      </Button>
                      {contact.status !== "REVOKED" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg text-red-600 hover:text-red-700"
                          isPending={pendingKey === `revoke:${contact.id}`}
                          onClick={() => revokeContact(brand.id, contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Intrekken
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PortalBadge({ enabled }: { enabled: boolean }) {
  return enabled ? <Badge variant="verified">/brand actief</Badge> : <Badge variant="pending">Nog niet aangemaakt</Badge>;
}

function ContactStatusBadge({ status }: { status: BrandPortalWorkflowContact["status"] }) {
  if (status === "ACTIVE") return <Badge variant="verified">Actief</Badge>;
  if (status === "REVOKED") return <Badge variant="failed">Ingetrokken</Badge>;
  return <Badge variant="pending">Uitgenodigd</Badge>;
}

function activeContactCount(contacts: BrandPortalWorkflowContact[]) {
  return contacts.filter((contact) => contact.status === "ACTIVE").length;
}

function upsertContact(rows: BrandPortalWorkflowContact[], contact: BrandPortalWorkflowContact) {
  const next = rows.filter((row) => row.id !== contact.id);
  return [contact, ...next];
}
