"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  name: string;
}

export function DocumentForm({ brands, campaigns }: { brands: Option[]; campaigns: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      type: String(formData.get("type") || "CONTRACT"),
      status: String(formData.get("status") || "DRAFT"),
      owner: String(formData.get("owner") ?? ""),
      brandId: String(formData.get("brandId") || ""),
      campaignId: String(formData.get("campaignId") || ""),
      effectiveAt: String(formData.get("effectiveAt") || ""),
      expiresAt: String(formData.get("expiresAt") || ""),
      renewalAt: String(formData.get("renewalAt") || ""),
      externalUrl: String(formData.get("externalUrl") || ""),
      fileName: String(formData.get("fileName") || ""),
      storageKey: String(formData.get("storageKey") || ""),
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Document kon niet worden opgeslagen.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Documenttitel</span>
          <input name="title" required className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Merk-serviceovereenkomst" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Eigenaar</span>
          <input name="owner" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Daan" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Type</span>
          <select name="type" defaultValue="CONTRACT" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="CONTRACT">Contract</option>
            <option value="BRIEF">Brief</option>
            <option value="INVOICE">Factuur</option>
            <option value="RIGHTS">Rechten</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Status</span>
          <select name="status" defaultValue="DRAFT" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="DRAFT">Concept</option>
            <option value="ACTIVE">Actief</option>
            <option value="WAITING">Wachtend</option>
            <option value="RENEW_SOON">Binnenkort verlengen</option>
            <option value="EXPIRED">Verlopen</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Merk</span>
          <select name="brandId" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="">Geen merk</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Campagne</span>
          <select name="campaignId" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="">Geen campagne</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Ingangsdatum</span>
          <input name="effectiveAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Vervaldatum</span>
          <input name="expiresAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Verlengdatum</span>
          <input name="renewalAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Link</span>
          <input name="externalUrl" type="url" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="https://..." />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Bestandsnaam</span>
          <input name="fileName" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="agreement.pdf" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Storage key</span>
          <input name="storageKey" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="documents/..." />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Notities</span>
        <textarea name="notes" rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" placeholder="Verlengvoorwaarden, ontbrekende handtekeningen of linkcontext." />
      </label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-5">Document opslaan</Button>
    </form>
  );
}
