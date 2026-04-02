import type { CreatorProfile, Campaign } from "@prisma/client";

interface MatchRow {
  label: string;
  creatorValue: string;
  required: string;
  passes: boolean;
}

export function CampaignMatchCard({
  profile,
  campaign,
}: {
  profile: CreatorProfile;
  campaign: Campaign;
}) {
  const rows: MatchRow[] = [
    {
      label: "Country",
      creatorValue: `${profile.topCountryPercent?.toFixed(1) ?? "—"}% ${profile.topCountry ?? ""}`,
      required: `≥${campaign.targetCountryPercent ?? 0}% ${campaign.targetCountry ?? "any"}`,
      passes:
        !campaign.targetCountry ||
        (profile.topCountry === campaign.targetCountry &&
          (profile.topCountryPercent ?? 0) >= (campaign.targetCountryPercent ?? 0)),
    },
    {
      label: "Age 18+",
      creatorValue: `${profile.age18PlusPercent?.toFixed(1) ?? "—"}%`,
      required: `≥${campaign.targetMinAge18Percent ?? 0}%`,
      passes: (profile.age18PlusPercent ?? 0) >= (campaign.targetMinAge18Percent ?? 0),
    },
    {
      label: "Male",
      creatorValue: `${profile.malePercent?.toFixed(1) ?? "—"}%`,
      required: `≥${campaign.targetMalePercent ?? 0}%`,
      passes: (profile.malePercent ?? 0) >= (campaign.targetMalePercent ?? 0),
    },
    {
      label: "Followers",
      creatorValue: profile.totalFollowers.toLocaleString(),
      required: `≥${campaign.minFollowers.toLocaleString()}`,
      passes: profile.totalFollowers >= campaign.minFollowers,
    },
    {
      label: "Engagement",
      creatorValue: `${profile.engagementRate}%`,
      required: `≥${campaign.minEngagementRate}%`,
      passes: Number(profile.engagementRate) >= Number(campaign.minEngagementRate),
    },
  ];

  const passed = rows.filter((r) => r.passes).length;

  return (
    <div className="rounded-xl overflow-hidden" style={{ borderColor: "var(--border)", borderWidth: "1px", backgroundColor: "var(--bg-elevated)" }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Campaign Match: {campaign.name}</p>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: passed === rows.length ? "var(--success-bg)" : "var(--error-bg)",
            color: passed === rows.length ? "var(--success-text)" : "var(--error-text)",
          }}
        >
          {passed}/{rows.length} requirements met
        </span>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--muted)" }}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-5 py-2.5">
            <span className="text-base" style={{ color: row.passes ? "var(--success)" : "var(--error)" }}>
              {row.passes ? "✓" : "✗"}
            </span>
            <span className="text-sm w-24 shrink-0" style={{ color: "var(--card-foreground)" }}>{row.label}:</span>
            <span className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>{row.creatorValue}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>required: {row.required}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
