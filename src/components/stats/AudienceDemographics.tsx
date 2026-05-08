"use client";

import { useState } from "react";
import { Info } from "lucide-react";
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
  const isEmpty = data.sampleCount === 0;
  const showToggle = !!(showKindToggle && engaged);

  const ageEntries = Object.entries(data.ageBuckets)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  const ageSum = ageEntries.reduce((s, [, v]) => s + v, 0);

  const genderTotal =
    (data.genderSplit.male ?? 0) + (data.genderSplit.female ?? 0) + (data.genderSplit.other ?? 0);
  const topCountries = data.topCountries.slice(0, 6);
  const countrySum = topCountries.reduce((s, c) => s + c.share, 0);

  const emptyText =
    isEmpty && kind === "ENGAGED"
      ? "No engaged-audience samples yet for this range. Try a wider date range, or switch to Followers."
      : emptyMessage;

  return (
    <div className="space-y-4">
      {showToggle ? (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {data.sampleCount} {data.sampleCount === 1 ? "sample" : "samples"}
          </p>
          <div className="flex items-center gap-2">
            <div
              className="inline-flex rounded-md p-0.5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
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
            <KindInfoTooltip />
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {data.sampleCount} {data.sampleCount === 1 ? "sample" : "samples"}
        </p>
      )}

      {isEmpty ? (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{emptyText}</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

function KindInfoTooltip() {
  return (
    <span className="relative inline-flex group">
      <button
        type="button"
        aria-label="What's the difference between Followers and Engaged?"
        aria-describedby="kind-info-tooltip"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full focus:outline-none focus:ring-2"
        style={{ color: "var(--text-muted)" }}
      >
        <Info size={14} />
      </button>
      <span
        id="kind-info-tooltip"
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full mt-1 w-72 rounded-lg p-3 text-xs leading-relaxed opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 z-10"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <span className="block font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          Followers vs Engaged
        </span>
        <span className="block mb-1">
          <strong>Followers</strong> shows the demographics of everyone who follows this account.
        </span>
        <span className="block">
          <strong>Engaged</strong> shows the demographics of people who actually liked, commented,
          saved, or shared your content recently. Useful to check whether the people interacting
          match the people following. Instagram only — pulled from IG&rsquo;s engaged-audience
          insights.
        </span>
      </span>
    </span>
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
