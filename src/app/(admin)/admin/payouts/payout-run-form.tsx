"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function PayoutRunForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      name: String(formData.get("name") ?? ""),
      periodStart: String(formData.get("periodStart") || ""),
      periodEnd: String(formData.get("periodEnd") || ""),
      currency: String(formData.get("currency") || "EUR").toUpperCase(),
    };
    startTransition(async () => {
      const response = await fetch("/api/admin/payout-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not create payout run.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_170px_170px_100px_auto] md:items-end">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Run name</span>
          <input name="name" placeholder="Weekly payout run" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Start</span>
          <input name="periodStart" type="date" required defaultValue={start.toISOString().slice(0, 10)} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">End</span>
          <input name="periodEnd" type="date" required defaultValue={end.toISOString().slice(0, 10)} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Currency</span>
          <input name="currency" defaultValue="EUR" maxLength={3} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none focus:border-neutral-500" />
        </label>
        <Button type="submit" isPending={isPending}>Create run</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
