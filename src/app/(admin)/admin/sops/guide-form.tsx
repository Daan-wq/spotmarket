"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function GuideForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") || "PRODUCTION"),
      status: String(formData.get("status") || "ACTIVE"),
      owner: String(formData.get("owner") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      body: String(formData.get("body") ?? ""),
      nextReviewAt: String(formData.get("nextReviewAt") || ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/sops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Handleiding kon niet worden opgeslagen.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <input name="title" required placeholder="Titel handleiding" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
        <select name="category" defaultValue="PRODUCTION" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="SALES">Sales</option>
          <option value="BRAND_ONBOARDING">Merkonboarding</option>
          <option value="CLIPPER_RECRUITMENT">Clipperrecruitment</option>
          <option value="PRODUCTION">Productie</option>
          <option value="QC">Clipreview</option>
          <option value="PAYOUTS">Uitbetalingen</option>
          <option value="REPORTING">Rapportage</option>
        </select>
        <select name="status" defaultValue="ACTIVE" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="ACTIVE">Actief</option>
          <option value="DRAFT">Concept</option>
          <option value="NEEDS_REVIEW">Review nodig</option>
        </select>
        <input name="owner" placeholder="Eigenaar" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="nextReviewAt" type="date" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="summary" placeholder="Korte samenvatting" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
      </div>
      <textarea name="body" required rows={5} placeholder="Stappen die het team moet volgen." className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-4">Handleiding opslaan</Button>
    </form>
  );
}
