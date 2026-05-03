"use client";

import { useState } from "react";
import type { AggregatedDemographics } from "@/lib/stats/types";

interface AudienceDemographicsProps {
  follower: AggregatedDemographics;
  engaged?: AggregatedDemographics;
  showKindToggle?: boolean;
  emptyMessage?: string;
}

export function AudienceDemographics({
  follower,
  engaged,
  showKindToggle,
  emptyMessage = "No audience snapshots yet for this range.",
}: AudienceDemographicsProps) {
  const [kind, setKind] = useState<"FOLLOWER" | "ENGAGED">("FOLLOWER");
  const data = kind === "ENGAGED" && engaged ? engaged : follower;

  if (data.sampleCount === 0) {
    return (
      <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emptyMessage}</p>
      </div>
    );
  }

  const ageEntries = Object.entries(data.ageBuckets)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const ageSum = ageEntries.reduce((s, [, v]) => s + v, 0);

  const genderTotal =
    (data.genderSplit.male ?? 0) + (data.genderSplit.female ?? 0) + (data.genderSplit.other ?? 0);
  const topCountries = data.topCountries.slice(0, 6);
  const countrySum = topCountries.reduce((s, c) => s + c.share, 0);

  return (
    <div className="space-y-4">
      {showKindToggle && engaged ? (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {data.sampleCount} {data.sampleCount === 1 ? "sample" : "samples"}
          </p>
          <div className="inline-flex rounded-md p-0.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {(["FOLLOWER", "ENGAGED"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="text-xs font-medium px-2.5 py-1 rounded transition-colors"
                style={{
                  background: kind === k ? "var(--accent)" : "transparent",
                  color: kind === k ? "#fff" : "var(--text-secondary)",
                }}
              >
                {k === "FOLLOWER" ? "Followers" : "Engaged"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {data.sampleCount} {data.sampleCount === 1 ? "sample" : "samples"}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Section title="Age">
          {ageEntries.map(([bucket, v]) => {
            const pct = ageSum > 0 ? (v / ageSum) * 100 : 0;
            return <Bar key={bucket} label={bucket} pct={pct} color="#6366F1" />;
          })}
        </Section>

        <Section title="Gender">
          {genderTotal === 0 ? (
            <Empty text="No gender data" />
          ) : (
            (["male", "female", "other"] as const).map((g) => {
              const v = data.genderSplit[g] ?? 0;
              const pct = (v / genderTotal) * 100;
              return <Bar key={g} label={cap(g)} pct={pct} color="#14b8a6" />;
            })
          )}
        </Section>

        <Section title="Top countries">
          {topCountries.length === 0 ? (
            <Empty text="No country data" />
          ) : (
            topCountries.map((c) => {
              const pct = countrySum > 0 ? (c.share / countrySum) * 100 : 0;
              return <Bar key={c.code} label={c.code} pct={pct} color="#F59E0B" />;
            })
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs uppercase tracking-wide mb-3 font-semibold" style={{ color: "var(--text-muted)" }}>
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Bar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--text-primary)" }}>{label}</span>
        <span style={{ color: "var(--text-secondary)" }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs" style={{ color: "var(--text-muted)" }}>{text}</p>;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
