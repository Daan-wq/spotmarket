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
        setError(body.error ?? "Could not save guide.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <input name="title" required placeholder="Guide title" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
        <select name="category" defaultValue="PRODUCTION" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="SALES">Sales</option>
          <option value="BRAND_ONBOARDING">Brand onboarding</option>
          <option value="CLIPPER_RECRUITMENT">Clipper recruitment</option>
          <option value="PRODUCTION">Production</option>
          <option value="QC">Clip review</option>
          <option value="PAYOUTS">Payouts</option>
          <option value="REPORTING">Reporting</option>
        </select>
        <select name="status" defaultValue="ACTIVE" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="NEEDS_REVIEW">Needs review</option>
        </select>
        <input name="owner" placeholder="Owner" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="nextReviewAt" type="date" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="summary" placeholder="Short summary" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
      </div>
      <textarea name="body" required rows={5} placeholder="Steps the team should follow." className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-4">Save guide</Button>
    </form>
  );
}
