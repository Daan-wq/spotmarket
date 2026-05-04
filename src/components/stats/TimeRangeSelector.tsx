"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export type RangeKey = "7d" | "30d" | "90d" | "all";

const OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

export function TimeRangeSelector({ value }: { value: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setRange(next: RangeKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "30d") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div
      className="inline-flex rounded-lg p-0.5"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      role="group"
      aria-label="Time range"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRange(opt.value)}
            disabled={isPending}
            className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              opacity: isPending ? 0.6 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
