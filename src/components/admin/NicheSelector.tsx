"use client";

import { Niche } from "@prisma/client";
import { ALL_NICHES, NICHE_CONFIG } from "@/lib/niches";

interface NicheSelectorProps {
  value?: Niche | null;
  onChange: (niche: Niche | null) => void;
  includeEmpty?: boolean;
  showLegacy?: boolean;
}

export function NicheSelector({
  value,
  onChange,
  includeEmpty = true,
  showLegacy = true,
}: NicheSelectorProps) {
  const niches = showLegacy
    ? ALL_NICHES
    : ALL_NICHES.filter((n) => !NICHE_CONFIG[n].isLegacy);

  return (
    <div className="space-y-1">
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? (e.target.value as Niche) : null)
        }
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
        }}
      >
        {includeEmpty && <option value="">— Selecteer niche —</option>}
        {niches.map((niche) => {
          const cfg = NICHE_CONFIG[niche];
          return (
            <option key={niche} value={niche}>
              {cfg.isLegacy ? "⚠️ " : ""}
              {cfg.label} (€{cfg.cpmBenchmark} CPM)
            </option>
          );
        })}
      </select>
      {value && NICHE_CONFIG[value].isLegacy && (
        <p
          className="text-xs"
          style={{ color: "var(--error-text)" }}
        >
          ⚠️ {NICHE_CONFIG[value].description}
        </p>
      )}
      {value && !NICHE_CONFIG[value].isLegacy && (
        <p
          className="text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          Benchmark CPM: €{NICHE_CONFIG[value].cpmBenchmark} —{" "}
          {NICHE_CONFIG[value].description}
        </p>
      )}
    </div>
  );
}

export function NicheBadge({ niche }: { niche: Niche }) {
  const cfg = NICHE_CONFIG[niche];
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    orange: "bg-orange-100 text-orange-800",
    yellow: "bg-yellow-100 text-yellow-800",
    pink: "bg-pink-100 text-pink-800",
    red: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[cfg.color] ?? "bg-gray-100 text-gray-800"}`}
    >
      {cfg.isLegacy && "⚠️ "}
      {cfg.label}
    </span>
  );
}
