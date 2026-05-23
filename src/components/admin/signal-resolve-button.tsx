"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function SignalResolveButton({
  signalId,
  resolved,
}: {
  signalId: string;
  resolved: boolean;
}) {
  const router = useRouter();
  const [isResolved, setIsResolved] = useState(resolved);
  const [pending, startTransition] = useTransition();

  async function resolve() {
    if (pending || isResolved) return;
    try {
      const response = await fetch(`/api/admin/signals/${signalId}/resolve`, { method: "POST" });
      if (!response.ok) {
        toast.error("Kon waarschuwing niet oplossen");
        return;
      }
      setIsResolved(true);
      toast.success("Waarschuwing opgelost");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Netwerkfout");
    }
  }

  if (isResolved) {
    return (
      <span className="inline-flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
        Opgelost
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={resolve}
      disabled={pending}
      className="inline-flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
    >
      {pending ? "Bezig..." : "Waarschuwing oplossen"}
    </button>
  );
}
