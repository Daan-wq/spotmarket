"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function LeadCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      brandName: String(formData.get("brandName") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      source: String(formData.get("source") ?? ""),
      owner: String(formData.get("owner") ?? ""),
      stage: String(formData.get("stage") || "LEAD"),
      priority: String(formData.get("priority") || "MEDIUM"),
      estimatedValue: Number(formData.get("estimatedValue") || 0),
      probability: Number(formData.get("probability") || 0),
      nextFollowUpAt: String(formData.get("nextFollowUpAt") || ""),
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not create lead.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <input name="brandName" required placeholder="Brand name" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
        <input name="contactName" placeholder="Contact name" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="contactEmail" type="email" placeholder="Email" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <select name="stage" defaultValue="LEAD" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="LEAD">Lead</option>
          <option value="CONTACTED">Contacted</option>
          <option value="REPLIED">Replied</option>
          <option value="CALL_BOOKED">Call booked</option>
          <option value="PROPOSAL_SENT">Proposal sent</option>
        </select>
        <select name="priority" defaultValue="MEDIUM" className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-500">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <input name="estimatedValue" type="number" min="0" placeholder="Value" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="probability" type="number" min="0" max="100" placeholder="Probability %" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="nextFollowUpAt" type="date" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="source" placeholder="Source" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="owner" placeholder="Owner" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <input name="notes" placeholder="Next step notes" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500 md:col-span-2" />
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-4">Create lead</Button>
    </form>
  );
}
