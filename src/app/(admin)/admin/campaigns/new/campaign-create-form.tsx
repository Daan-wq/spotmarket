"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORM_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "X", label: "X" },
] as const;

type PlatformValue = typeof PLATFORM_OPTIONS[number]["value"];

const CONTENT_TYPE_OPTIONS = ["Sports", "Memes", "Casino", "Lifestyle", "Crypto", "Finance", "Films/Series", "Influencer"];

const COUNTRY_OPTIONS = [
  "Austria", "Belgium", "Brazil", "Canada", "Croatia", "Czech Republic", "Denmark",
  "Finland", "France", "Germany", "Greece", "Hungary", "India", "Indonesia",
  "Ireland", "Italy", "Japan", "Mexico", "Netherlands", "Norway", "Poland",
  "Portugal", "Romania", "Spain", "Sweden", "Switzerland", "Turkey",
  "United Kingdom", "United States",
] as const;

const PAGE_STAT_OPTIONS: readonly { key: string; label: string; placeholder: string; suffix?: string }[] = [
  { key: "minAge", label: "Minimum age", placeholder: "e.g. 25+" },
  { key: "minEngagement", label: "Min. engagement rate", placeholder: "e.g. 3", suffix: "%" },
  { key: "minFollowers", label: "Min. followers", placeholder: "e.g. 10k" },
  { key: "malePercent", label: "Male audience", placeholder: "e.g. 60", suffix: "%" },
  { key: "countryPercent", label: "Country audience", placeholder: "e.g. 50", suffix: "%" },
];

interface CountryEntry {
  country: string;
  audiencePercent: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: "14px",
  outline: "none",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elevated, var(--bg-card))",
  borderRadius: "12px",
  border: "1px solid var(--border)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "6px",
  color: "var(--text-secondary)",
};

function parseViews(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  const m = s.match(/^([\d.,]+)\s*(k|m|b)?$/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  if (isNaN(n)) return null;
  if (m[2] === "k") return Math.round(n * 1_000);
  if (m[2] === "m") return Math.round(n * 1_000_000);
  if (m[2] === "b") return Math.round(n * 1_000_000_000);
  return Math.round(n);
}

function fmtViews(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B views`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
  return `${n} views`;
}

export function CampaignCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // — Announcement fields (shown in Discord post) —
  const [name, setName] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [platforms, setPlatforms] = useState<PlatformValue[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [requirements, setRequirements] = useState("");
  const [enabledStats, setEnabledStats] = useState<Record<string, boolean>>({});
  const [statValues, setStatValues] = useState<Record<string, string>>({});

  // — Full details (revealed after approval) —
  const [goalViewsRaw, setGoalViewsRaw] = useState("");
  const [adminMarginPerM, setAdminMarginPerM] = useState("25");
  const [referralLink, setReferralLink] = useState("");
  const [contentGuidelines, setContentGuidelines] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const budget = parseFloat(totalBudget) || 0;
  const goalViews = parseViews(goalViewsRaw);
  const margin = parseFloat(adminMarginPerM) || 0;
  const businessPerM = goalViews && budget > 0 ? (budget / goalViews) * 1_000_000 : null;
  const creatorPerM = businessPerM !== null ? businessPerM - margin : null;

  function toggleContentType(ct: string) {
    setSelectedContentTypes((prev) =>
      prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct]
    );
  }

  function addCountry(country: string) {
    if (countries.some((c) => c.country === country)) return;
    setCountries((prev) => [...prev, { country, audiencePercent: "" }]);
    setCountrySearch("");
  }

  function removeCountry(country: string) {
    setCountries((prev) => prev.filter((c) => c.country !== country));
  }

  function setCountryPercent(country: string, pct: string) {
    setCountries((prev) =>
      prev.map((c) => (c.country === country ? { ...c, audiencePercent: pct } : c))
    );
  }

  function toggleStat(key: string) {
    setEnabledStats((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setStatValue(key: string, value: string) {
    setStatValues((prev) => ({ ...prev, [key]: value }));
  }

  const filteredCountries = countrySearch.trim()
    ? COUNTRY_OPTIONS.filter(
        (c) =>
          c.toLowerCase().includes(countrySearch.toLowerCase()) &&
          !countries.some((sel) => sel.country === c)
      )
    : [];

  async function handleSubmit(status: "draft" | "active") {
    setError(null);

    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (!budget || budget <= 0) { setError("Budget must be a positive number"); return; }
    if (!deadline) { setError("Deadline is required"); return; }
    if (creatorPerM !== null && creatorPerM < 0) { setError("Margin too high — creator rate would be negative"); return; }

    setLoading(true);
    try {
      // Build regions string from countries
      const regionsStr = countries.map((c) => {
        if (c.audiencePercent) return `${c.country} (${c.audiencePercent}%)`;
        return c.country;
      }).join(" · ") || undefined;

      // Build page stats JSON
      const pageStats: Record<string, string> = {};
      for (const stat of PAGE_STAT_OPTIONS) {
        if (enabledStats[stat.key] && statValues[stat.key]) {
          pageStats[stat.key] = statValues[stat.key];
        }
      }

      const body: Record<string, unknown> = {
        name,
        platforms,
        contentType: selectedContentTypes.length > 0 ? selectedContentTypes.join(" · ") : undefined,
        requirements: requirements || undefined,
        otherNotes: regionsStr,
        pageStats: Object.keys(pageStats).length > 0 ? JSON.stringify(pageStats) : undefined,
        minAge: enabledStats.minAge && statValues.minAge ? statValues.minAge : undefined,
        contentGuidelines: contentGuidelines || undefined,
        referralLink: referralLink || undefined,
        totalBudget: budget,
        goalViews: goalViews ?? undefined,
        adminMarginPerM: margin,
        deadline: new Date(deadline).toISOString(),
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        requiresApproval: true,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create campaign");
      }

      const campaign = await res.json();

      if (status === "active") {
        await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      }

      router.push("/admin/campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "640px" }}>

      {/* ── Section 1: Announcement ── */}
      <div style={cardStyle}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted, var(--text-secondary))", marginBottom: "4px" }}>
            📢 Announcement
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            This is what creators see in the Discord post.
          </p>
        </div>

        <div>
          <label style={labelStyle}>Campaign name *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LOGO CLIPPING DEAL"
          />
        </div>

        <div>
          <label style={labelStyle}>Budget (€) *</label>
          <input
            style={inputStyle}
            type="number"
            min="1"
            step="any"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            placeholder="e.g. 10000"
          />
        </div>

        <div>
          <label style={labelStyle}>Countries</label>
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Search and add countries..."
            />
            {filteredCountries.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                background: "var(--bg-elevated, var(--bg-card))", border: "1px solid var(--border)",
                borderRadius: "8px", marginTop: "4px", maxHeight: "160px", overflowY: "auto",
              }}>
                {filteredCountries.slice(0, 8).map((c) => (
                  <button
                    key={c} type="button"
                    onClick={() => addCountry(c)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", fontSize: "13px", border: "none",
                      background: "transparent", color: "var(--text-primary)", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-secondary, var(--bg-primary))"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          {countries.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {countries.map((entry) => (
                <div key={entry.country} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", flex: 1 }}>{entry.country}</span>
                  <input
                    style={{ ...inputStyle, width: "80px", textAlign: "center" }}
                    type="number" min="0" max="100"
                    value={entry.audiencePercent}
                    onChange={(e) => setCountryPercent(entry.country, e.target.value)}
                    placeholder="%"
                  />
                  <button
                    type="button"
                    onClick={() => removeCountry(entry.country)}
                    style={{
                      background: "none", border: "none", color: "var(--text-secondary)",
                      cursor: "pointer", fontSize: "16px", padding: "0 4px",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={labelStyle}>Platforms *</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PLATFORM_OPTIONS.map(({ value, label }) => {
              const selected = platforms.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setPlatforms((prev) =>
                      selected ? prev.filter((p) => p !== value) : [...prev, value]
                    )
                  }
                  style={{
                    padding: "6px 16px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                    border: `1px solid ${selected ? "var(--accent, #534AB7)" : "var(--border)"}`,
                    background: selected ? "var(--accent, #534AB7)" : "var(--bg-card)",
                    color: selected ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Content types</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {CONTENT_TYPE_OPTIONS.map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => toggleContentType(ct)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `1px solid ${selectedContentTypes.includes(ct) ? "var(--accent, #534AB7)" : "var(--border)"}`,
                  background: selectedContentTypes.includes(ct) ? "var(--accent, #534AB7)" : "var(--bg-card)",
                  color: selectedContentTypes.includes(ct) ? "#fff" : "var(--text-secondary)",
                }}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Page statistics</label>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Toggle the stats you want to require. Optionally set a minimum value.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {PAGE_STAT_OPTIONS.map((stat) => (
              <div key={stat.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => toggleStat(stat.key)}
                  style={{
                    width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                    border: `1px solid ${enabledStats[stat.key] ? "var(--accent, #534AB7)" : "var(--border)"}`,
                    background: enabledStats[stat.key] ? "var(--accent, #534AB7)" : "transparent",
                    color: "#fff", fontSize: "12px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {enabledStats[stat.key] ? "✓" : ""}
                </button>
                <span style={{ fontSize: "13px", color: "var(--text-primary)", minWidth: "140px" }}>{stat.label}</span>
                {enabledStats[stat.key] && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      style={{ ...inputStyle, width: "80px", textAlign: "center" }}
                      value={statValues[stat.key] ?? ""}
                      onChange={(e) => setStatValue(stat.key, e.target.value)}
                      placeholder={stat.placeholder}
                    />
                    {stat.suffix && (
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{stat.suffix}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Requirements (one per line)</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder={"Banner must appear in clip\nClickable link in bio"}
          />
        </div>
      </div>

      {/* ── Section 2: Full details (after approval) ── */}
      <div style={cardStyle}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted, var(--text-secondary))", marginBottom: "4px" }}>
            🔒 Full details — shown after approval
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Creators only see this after their application is accepted.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Goal views</label>
            <input
              style={inputStyle}
              value={goalViewsRaw}
              onChange={(e) => setGoalViewsRaw(e.target.value)}
              placeholder="e.g. 200m, 500k"
            />
            {goalViews ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--text-muted, var(--text-secondary))" }}>{fmtViews(goalViews)}</p>
            ) : goalViewsRaw ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--error, #dc2626)" }}>Invalid — try: 200m, 500k</p>
            ) : null}
          </div>
          <div>
            <label style={labelStyle}>Your margin ($/1M views)</label>
            <input
              style={inputStyle}
              type="number"
              step="1"
              value={adminMarginPerM}
              onChange={(e) => setAdminMarginPerM(e.target.value)}
              placeholder="25"
            />
          </div>
        </div>

        {/* Economics preview */}
        {businessPerM !== null && creatorPerM !== null && goalViews && (
          <div style={{ borderRadius: "8px", padding: "12px 14px", background: "var(--bg-secondary, var(--bg-primary))", border: "1px solid var(--border)", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Client pays (per 1M views)</span>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>${businessPerM.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--error, #dc2626)" }}>
              <span>Your margin</span>
              <span>−${margin.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Creator earns (per 1M views)</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>${creatorPerM.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--accent, #534AB7)" }}>
              <span>Your revenue</span>
              <span>${((margin / 1_000_000) * goalViews).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Referral / tracking link</label>
          <input
            style={inputStyle}
            type="url"
            value={referralLink}
            onChange={(e) => setReferralLink(e.target.value)}
            placeholder="https://your-link.com?ref=xxx"
          />
        </div>

        <div>
          <label style={labelStyle}>Content guidelines</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={contentGuidelines}
            onChange={(e) => setContentGuidelines(e.target.value)}
            placeholder="What creators must include: CTAs, hashtags, dos/don'ts..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Deadline *</label>
            <input
              style={inputStyle}
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Start date</label>
            <input
              style={inputStyle}
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--error-bg, #fecaca)", color: "var(--error-text, #dc2626)", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "14px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("active")}
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 0",
            borderRadius: "8px",
            border: "none",
            background: "var(--accent, #534AB7)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "14px",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creating…" : "Launch campaign"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "10px 20px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontWeight: 500,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
