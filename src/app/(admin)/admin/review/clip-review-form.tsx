"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ClipReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const payload = {
      hookScore: Number(formData.get("hookScore") || 5),
      pacingScore: Number(formData.get("pacingScore") || 5),
      captionsScore: Number(formData.get("captionsScore") || 5),
      brandFitScore: Number(formData.get("brandFitScore") || 5),
      logoPresent: formData.get("logoPresent") === "true",
      noSpellingMistakes: true,
      correctFormat: true,
      audioQuality: true,
      ctaIncluded: formData.get("ctaIncluded") === "true",
      decision: String(formData.get("decision") || "REVISION"),
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch(`/api/admin/qc/submissions/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not save review.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
      <div className="grid grid-cols-2 gap-2">
        {["hookScore", "pacingScore", "captionsScore", "brandFitScore"].map((name) => (
          <label key={name}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">{name.replace("Score", "")}</span>
            <input name={name} type="number" min="1" max="10" defaultValue="7" className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-neutral-500" />
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select name="logoPresent" defaultValue="true" className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-500">
          <option value="true">Logo present</option>
          <option value="false">Logo missing</option>
        </select>
        <select name="ctaIncluded" defaultValue="true" className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-500">
          <option value="true">CTA included</option>
          <option value="false">CTA missing</option>
        </select>
        <select name="decision" defaultValue="REVISION" className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm outline-none focus:border-neutral-500">
          <option value="APPROVED">Approve</option>
          <option value="REVISION">Ask revision</option>
          <option value="REJECTED">Reject</option>
        </select>
      </div>
      <input name="notes" placeholder="Review notes" className="mt-2 h-9 w-full rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-neutral-500" />
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      <Button type="submit" size="sm" isPending={isPending} className="mt-3">Save review</Button>
    </form>
  );
}
