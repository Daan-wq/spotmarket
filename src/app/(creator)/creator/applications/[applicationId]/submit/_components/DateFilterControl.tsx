"use client";

export interface DateFilter {
  mode: "campaign" | "custom";
  from?: string; // YYYY-MM-DD
  to?: string;
}

interface Props {
  filter: DateFilter;
  campaignStartDate: string | null;
  onChange: (f: DateFilter) => void;
}

export default function DateFilterControl({ filter, campaignStartDate, onChange }: Props) {
  const isCustom = filter.mode === "custom";

  const resetToCampaign = () =>
    onChange({ mode: "campaign", from: campaignStartDate ?? undefined });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isCustom ? (
        <>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {campaignStartDate
              ? `After ${new Date(campaignStartDate).toLocaleDateString()}`
              : "All time"}
          </span>
          <button
            onClick={() => onChange({ mode: "custom", from: filter.from, to: filter.to })}
            className="text-xs underline cursor-pointer"
            style={{ color: "var(--primary)" }}
          >
            Custom range
          </button>
        </>
      ) : (
        <>
          <input
            type="date"
            value={filter.from ?? ""}
            onChange={(e) => onChange({ ...filter, from: e.target.value || undefined })}
            className="px-2 py-1 rounded-lg border text-xs focus:outline-none"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>to</span>
          <input
            type="date"
            value={filter.to ?? ""}
            onChange={(e) => onChange({ ...filter, to: e.target.value || undefined })}
            className="px-2 py-1 rounded-lg border text-xs focus:outline-none"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={resetToCampaign}
            className="text-xs underline cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            Reset
          </button>
        </>
      )}
    </div>
  );
}
