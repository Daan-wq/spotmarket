"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const platforms = [
  ["INSTAGRAM", "Instagram"],
  ["TIKTOK", "TikTok"],
  ["YOUTUBE_SHORTS", "YouTube Shorts"],
  ["FACEBOOK", "Facebook"],
  ["X", "X"],
] as const;

export function PricingPackageForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const selectedPlatforms = platforms
      .map(([value]) => value)
      .filter((value) => formData.getAll("platforms").includes(value));

    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: Number(formData.get("price") || 0),
      currency: String(formData.get("currency") || "EUR").toUpperCase(),
      platforms: selectedPlatforms,
      includedClips: Number(formData.get("includedClips") || 0),
      includedViews: Number(formData.get("includedViews") || 0),
      creatorRatePerClip: Number(formData.get("creatorRatePerClip") || 0),
      businessCpv: Number(formData.get("businessCpv") || 0),
      marginPercent: Number(formData.get("marginPercent") || 0),
      isActive: true,
      notes: String(formData.get("notes") ?? ""),
    };

    startTransition(async () => {
      const response = await fetch("/api/admin/pricing-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Could not save package.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Package name</span>
          <input name="name" required className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="Starter launch" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Price</span>
          <input name="price" type="number" min="0" step="1" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="2500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Currency</span>
          <input name="currency" defaultValue="EUR" maxLength={3} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm uppercase outline-none focus:border-neutral-500" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Included clips</span>
          <input name="includedClips" type="number" min="0" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="20" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Included views</span>
          <input name="includedViews" type="number" min="0" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="500000" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Creator per clip</span>
          <input name="creatorRatePerClip" type="number" min="0" step="0.01" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="35" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Business CPV</span>
          <input name="businessCpv" type="number" min="0" step="0.000001" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="0.008" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Margin %</span>
          <input name="marginPercent" type="number" min="0" max="100" step="0.01" className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" placeholder="35" />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Platforms</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {platforms.map(([value, label]) => (
            <label key={value} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              <input name="platforms" type="checkbox" value={value} className="h-4 w-4 accent-neutral-950" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Description</span>
        <textarea name="description" rows={3} className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" placeholder="Who this package is for and what it includes." />
      </label>
      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Notes</span>
        <textarea name="notes" rows={2} className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-500" placeholder="Default delivery assumptions or internal handoff notes." />
      </label>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <Button type="submit" isPending={isPending} className="mt-5">Save package</Button>
    </form>
  );
}
