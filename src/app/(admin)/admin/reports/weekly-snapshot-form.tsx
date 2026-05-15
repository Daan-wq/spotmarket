"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function WeeklySnapshotForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 7);

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      weekStart: String(formData.get("weekStart") || ""),
      weekEnd: String(formData.get("weekEnd") || ""),
      status: "SAVED",
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/weekly-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not save weekly numbers.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_180px_1fr_auto] md:items-end">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Week start</span>
          <input name="weekStart" type="date" defaultValue={toDateInput(weekStart)} required className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Week end</span>
          <input name="weekEnd" type="date" defaultValue={toDateInput(today)} required className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Notes</span>
          <input name="notes" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="What changed this week?" />
        </label>
        <Button type="submit" isPending={isPending}>Save snapshot</Button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
