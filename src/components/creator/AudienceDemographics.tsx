"use client";

import type { IgDemographics } from "@/types/instagram";

const FLAGS: Record<string, string> = {
  US: "🇺🇸", NL: "🇳🇱", DE: "🇩🇪", GB: "🇬🇧", FR: "🇫🇷",
  CA: "🇨🇦", AU: "🇦🇺", BR: "🇧🇷", IN: "🇮🇳", MX: "🇲🇽",
  ES: "🇪🇸", IT: "🇮🇹", JP: "🇯🇵", KR: "🇰🇷", NG: "🇳🇬",
  ZA: "🇿🇦", PH: "🇵🇭", ID: "🇮🇩", TR: "🇹🇷", AR: "🇦🇷",
};

interface Props {
  demographics: IgDemographics | null;
  followerCount: number;
  updatedAt?: Date | null;
}

function getDaysOld(updatedAt: Date | null | undefined): number | null {
  if (!updatedAt) return null;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

export function AudienceDemographics({ demographics, followerCount, updatedAt }: Props) {
  const daysOld = getDaysOld(updatedAt);

  if (followerCount < 100 || !demographics) {
    return (
      <div className="rounded-xl px-5 py-6 text-center" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-secondary)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {followerCount < 100
            ? "Connect an account with 100+ followers to see audience demographics"
            : "Demographics not yet loaded — click Refresh to fetch"}
        </p>
      </div>
    );
  }

  // Countries
  const countryEntries = Object.entries(demographics.countries ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const totalCountry = countryEntries.reduce((s, [, v]) => s + v, 0);

  // Gender
  const { male = 0, female = 0, unknown = 0 } = demographics.genders ?? {};
  const totalG = male + female + unknown;
  const pct = (n: number) => (totalG > 0 ? ((n / totalG) * 100).toFixed(1) : "0");

  // Age
  const ages = demographics.ages ?? {};
  const ageRanges: [string, number][] = [
    ["13-17", ages["13-17"] ?? 0], ["18-24", ages["18-24"] ?? 0],
    ["25-34", ages["25-34"] ?? 0], ["35-44", ages["35-44"] ?? 0],
    ["45-54", ages["45-54"] ?? 0], ["55-64", ages["55-64"] ?? 0],
    ["65+", ages["65+"] ?? 0],
  ];
  const totalAge = ageRanges.reduce((s, [, v]) => s + v, 0);
  const total18Plus = ageRanges.slice(1).reduce((s, [, v]) => s + v, 0);
  const age18Pct = totalAge > 0 ? ((total18Plus / totalAge) * 100).toFixed(1) : "0";
  const maxAge = Math.max(...ageRanges.map(([, v]) => v), 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Audience Demographics</h3>
        {daysOld !== null && daysOld > 14 ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--warning-text)", backgroundColor: "var(--warning-bg)" }}>
            May be outdated — updated {daysOld}d ago
          </span>
        ) : daysOld !== null ? (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Updated {daysOld === 0 ? "today" : `${daysOld}d ago`}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Countries */}
        <div className="rounded-xl p-4" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Country</p>
          <div className="space-y-2.5">
            {countryEntries.map(([code, count]) => {
              const p = totalCountry > 0 ? ((count / totalCountry) * 100).toFixed(1) : "0";
              return (
                <div key={code}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[13px]" style={{ color: "var(--card-foreground)" }}>{FLAGS[code] ?? "🌐"} {code}</span>
                    <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{p}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                    <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gender */}
        <div className="rounded-xl p-4" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Gender</p>
          <div className="h-4 rounded-full overflow-hidden flex mb-3">
            <div className="h-full" style={{ width: `${pct(male)}%`, backgroundColor: "rgba(59, 130, 246, 0.6)" }} />
            <div className="h-full" style={{ width: `${pct(female)}%`, backgroundColor: "rgba(244, 114, 182, 0.6)" }} />
            <div className="h-full" style={{ width: `${pct(unknown)}%`, backgroundColor: "var(--muted)" }} />
          </div>
          <div className="space-y-1.5">
            {([["rgba(59, 130, 246, 0.6)", "Male", male], ["rgba(244, 114, 182, 0.6)", "Female", female], ["var(--muted)", "Other", unknown]] as const).map(
              ([color, label, val]) =>
                Number(pct(val)) > 0 ? (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[13px] flex-1" style={{ color: "var(--card-foreground)" }}>{label}</span>
                    <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>{pct(val)}%</span>
                  </div>
                ) : null
            )}
          </div>
        </div>

        {/* Age */}
        <div className="rounded-xl p-4" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-elevated)" }}>
          <p className="text-xs font-medium mb-1 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Age</p>
          <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>{age18Pct}% are 18+</p>
          <div className="flex items-end gap-1 h-20">
            {ageRanges.map(([range, count]) => (
              <div key={range} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: 56 }}>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(count / maxAge) * 100}%`,
                      backgroundColor: range === "13-17" ? "var(--muted)" : "var(--accent)",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="text-[9px] text-center leading-tight" style={{ color: "var(--text-muted)" }}>{range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
