"use client";

import { useState } from "react";
import { Mail, RotateCw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface BrandContactRow {
  id: string;
  brandId: string;
  email: string;
  name: string | null;
  status: "INVITED" | "ACTIVE" | "REVOKED";
  inviteExpiresAt: string | null;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface BrandContactPanelBrand {
  id: string;
  name: string;
  contactEmail: string | null;
  contacts: BrandContactRow[];
}

export function BrandContactsPanel({ brands }: { brands: BrandContactPanelBrand[] }) {
  const [contactsByBrand, setContactsByBrand] = useState(() => {
    return Object.fromEntries(brands.map((brand) => [brand.id, brand.contacts]));
  });
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [inviteUrls, setInviteUrls] = useState<Record<string, string>>({});
  const [inviteEmailSent, setInviteEmailSent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

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
      return;
    }

    setContactsByBrand((current) => ({
      ...current,
      [brandId]: upsertContact(current[brandId] ?? [], body.contact),
    }));
    if (body.inviteUrl) {
      setInviteUrls((current) => ({ ...current, [body.contact.id]: body.inviteUrl }));
      setInviteEmailSent((current) => ({ ...current, [body.contact.id]: Boolean(body.emailSent) }));
    }
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
      setError(typeof body.error === "string" ? body.error : "Intrekken mislukt.");
      return;
    }

    setContactsByBrand((current) => ({
      ...current,
      [brandId]: upsertContact(current[brandId] ?? [], body.contact),
    }));
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {brands.map((brand) => {
          const contacts = contactsByBrand[brand.id] ?? [];
          return (
            <article key={brand.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-neutral-950">{brand.name}</h3>
                  <p className="mt-1 text-xs text-neutral-500">{brand.contactEmail ?? "Geen standaard contactmail"}</p>
                </div>
                <Badge variant="neutral">{contacts.filter((contact) => contact.status === "ACTIVE").length} actief</Badge>
              </div>

              <form
                className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  inviteContact(brand.id, new FormData(event.currentTarget));
                  event.currentTarget.reset();
                }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="contact@brand.com"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                />
                <input
                  name="name"
                  type="text"
                  placeholder="Naam"
                  className="h-10 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                />
                <Button type="submit" size="sm" className="h-10 rounded-lg" isPending={pendingKey === `invite:${brand.id}`}>
                  <Mail className="h-4 w-4" />
                  Uitnodigen
                </Button>
              </form>

              <div className="mt-4 space-y-2">
                {contacts.length === 0 ? (
                  <p className="rounded-lg bg-neutral-50 px-3 py-3 text-sm text-neutral-500">Nog geen brandcontacten.</p>
                ) : (
                  contacts.map((contact) => (
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
                              {inviteEmailSent[contact.id]
                                ? "Mail verzonden. De link blijft beschikbaar om opnieuw te delen."
                                : "Mail niet verzonden; kopieer de link en stuur hem zelf door."}
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-lg"
                          isPending={pendingKey === `invite:${brand.id}`}
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
          );
        })}
      </div>
    </div>
  );
}

function ContactStatusBadge({ status }: { status: BrandContactRow["status"] }) {
  if (status === "ACTIVE") {
    return <Badge variant="verified" icon={<ShieldCheck className="h-3 w-3" />}>Actief</Badge>;
  }
  if (status === "REVOKED") return <Badge variant="failed">Ingetrokken</Badge>;
  return <Badge variant="pending">Uitgenodigd</Badge>;
}

function upsertContact(rows: BrandContactRow[], contact: BrandContactRow) {
  const next = rows.filter((row) => row.id !== contact.id);
  return [contact, ...next];
}
