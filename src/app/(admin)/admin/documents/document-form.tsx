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
        setError(body.error ?? "Could not save document.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Document title</span>
          <input name="title" required className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Brand service agreement" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Owner</span>
          <input name="owner" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Daan" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Type</span>
          <select name="type" defaultValue="CONTRACT" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="CONTRACT">Contract</option>
            <option value="BRIEF">Brief</option>
            <option value="INVOICE">Invoice</option>
            <option value="RIGHTS">Rights</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Status</span>
          <select name="status" defaultValue="DRAFT" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="WAITING">Waiting</option>
            <option value="RENEW_SOON">Renew soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Brand</span>
          <select name="brandId" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="">No brand</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Campaign</span>
          <select name="campaignId" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
            <option value="">No campaign</option>
            {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Effective date</span>
          <input name="effectiveAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Expiry date</span>
          <input name="expiresAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Renewal date</span>
          <input name="renewalAt" type="date" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Link</span>
          <input name="externalUrl" type="url" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="https://..." />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">File name</span>
          <input name="fileName" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="agreement.pdf" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Storage key</span>
          <input name="storageKey" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="documents/..." />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Notes</span>
        <textarea name="notes" rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" placeholder="Renewal terms, missing signatures, or link context." />
      </label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-5">Save document</Button>
    </form>
  );
}
