"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignImageUploadField } from "@/components/campaigns/campaign-image-upload-field";

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

const GEO_OPTIONS = [
  "US",
  "GB",
  "NL",
  "BE",
  "DE",
  "GR",
  "AU",
  "CA",
  "SE",
  "NO",
  "FI",
  "DK",
  "AT",
  "CH",
  "ES",
  "FR",
  "IT",
  "PT",
  "PL",
  "CZ",
  "HU",
  "RO",
  "BG",
  "HR",
  "SK",
  "SI",
  "EE",
  "LV",
  "LT",
  "MT",
  "CY",
  "LU",
  "IE",
] as const;

const PAGE_STAT_OPTIONS: readonly { key: string; label: string; placeholder: string; suffix?: string }[] = [
  { key: "minAge", label: "Minimum age", placeholder: "e.g. 25+" },
  { key: "minEngagement", label: "Min. engagementrate", placeholder: "bijv. 3", suffix: "%" },
  { key: "minFollowers", label: "Min. volgers", placeholder: "bijv. 10k" },
  { key: "malePercent", label: "Mannelijk publiek", placeholder: "bijv. 60", suffix: "%" },
  { key: "countryPercent", label: "Landpubliek", placeholder: "bijv. 50", suffix: "%" },
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

function parseLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function numberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function CampaignCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // — Announcement fields (shown in Discord post) —
  const [name, setName] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [totalBudget, setTotalBudget] = useState("");
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [platforms, setPlatforms] = useState<PlatformValue[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [requiredHashtagsText, setRequiredHashtagsText] = useState("");
  const [enabledStats, setEnabledStats] = useState<Record<string, boolean>>({});
  const [statValues, setStatValues] = useState<Record<string, string>>({});

  // — Full details (revealed after approval) —
  const [businessCpmRaw, setBusinessCpmRaw] = useState("");
  const [minimumPaidViewsRaw, setMinimumPaidViewsRaw] = useState("");
  const [maximumPaidViewsRaw, setMaximumPaidViewsRaw] = useState("");
  const [adminMarginPerK, setAdminMarginPerK] = useState("0.03");
  const [referralLink, setReferralLink] = useState("");
  const [contentGuidelines, setContentGuidelines] = useState("");
  const [bannerVideoUrl, setBannerVideoUrl] = useState("");
  const [briefAssetUrl, setBriefAssetUrl] = useState("");
  const [guidelinesUrl, setGuidelinesUrl] = useState("");
  const [contentAssetUrlsText, setContentAssetUrlsText] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [targetCountryPercent, setTargetCountryPercent] = useState("");
  const [targetMinAge18Percent, setTargetMinAge18Percent] = useState("");
  const [targetMalePercent, setTargetMalePercent] = useState("");
  const [minFollowers, setMinFollowers] = useState("");
  const [minEngagementRate, setMinEngagementRate] = useState("");
  const [bioRequirement, setBioRequirement] = useState("");
  const [linkInBioRequired, setLinkInBioRequired] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [maxSlots, setMaxSlots] = useState("");

  const budget = parseFloat(totalBudget) || 0;
  const businessPerK = parseFloat(businessCpmRaw) || 0;
  const goalViews = budget > 0 && businessPerK > 0 ? Math.max(1, Math.round((budget / businessPerK) * 1_000)) : null;
  const minimumPaidViews = minimumPaidViewsRaw.trim() ? parseViews(minimumPaidViewsRaw) : 0;
  const maximumPaidViews = maximumPaidViewsRaw.trim() ? parseViews(maximumPaidViewsRaw) : null;
  const margin = parseFloat(adminMarginPerK) || 0;
  const creatorPerK = businessPerK > 0 ? businessPerK - margin : null;

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

    if (!name.trim()) { setError("Campagnenaam is verplicht"); return; }
    if (!budget || budget <= 0) { setError("Budget moet een positief getal zijn"); return; }
    if (!businessPerK || businessPerK <= 0 || !goalViews) { setError("Business CPM moet hoger zijn dan 0"); return; }
    if (!deadline) { setError("Deadline is verplicht"); return; }
    if (creatorPerK !== null && creatorPerK < 0) { setError("Marge is te hoog - creatortarief zou negatief worden"); return; }
    if (minimumPaidViewsRaw.trim() && minimumPaidViews === null) { setError("Minimum betaalde views moet een heel getal zijn"); return; }
    if (maximumPaidViewsRaw.trim() && maximumPaidViews === null) { setError("Maximum betaalde views moet een heel getal zijn of leeg blijven"); return; }
    if (maximumPaidViews !== null && minimumPaidViews !== null && maximumPaidViews < minimumPaidViews) {
      setError("Maximum betaalde views moet leeg zijn of groter dan of gelijk aan minimum betaalde views");
      return;
    }

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

      const contentAssetUrls = parseLines(contentAssetUrlsText);
      const requiredHashtags = parseLines(requiredHashtagsText);

      const body: Record<string, unknown> = {
        name,
        platforms,
        contentType: selectedContentTypes.length > 0 ? selectedContentTypes.join(" · ") : undefined,
        description: description || undefined,
        requirements: requirements || undefined,
        otherNotes: regionsStr,
        pageStats: Object.keys(pageStats).length > 0 ? JSON.stringify(pageStats) : undefined,
        minAge: enabledStats.minAge && statValues.minAge ? statValues.minAge : undefined,
        contentGuidelines: contentGuidelines || undefined,
        referralLink: referralLink || undefined,
        bannerUrl: bannerUrl || undefined,
        bannerVideoUrl: bannerVideoUrl || undefined,
        briefAssetUrl: briefAssetUrl || undefined,
        guidelinesUrl: guidelinesUrl || undefined,
        contentAssetUrls: contentAssetUrls.length > 0 ? contentAssetUrls : undefined,
        requiredHashtags: requiredHashtags.length > 0 ? requiredHashtags : undefined,
        targetCountry: targetCountry || undefined,
        targetCountryPercent: numberOrUndefined(targetCountryPercent),
        targetMinAge18Percent: numberOrUndefined(targetMinAge18Percent),
        targetMalePercent: numberOrUndefined(targetMalePercent),
        minFollowers: numberOrUndefined(minFollowers),
        minEngagementRate: numberOrUndefined(minEngagementRate),
        bioRequirement: bioRequirement || undefined,
        linkInBioRequired: linkInBioRequired || undefined,
        totalBudget: budget,
        goalViews: goalViews ?? undefined,
        minimumPaidViews: minimumPaidViews ?? 0,
        maximumPaidViews: maximumPaidViewsRaw.trim() ? maximumPaidViews : undefined,
        adminMarginPerK: margin,
        deadline: new Date(deadline).toISOString(),
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
        maxSlots: numberOrUndefined(maxSlots),
        requiresApproval: true,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Campagne maken mislukt");
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
      setError(err instanceof Error ? err.message : "Er ging iets mis");
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
          <label style={labelStyle}>Campagnenaam *</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LOGO CLIPPING DEAL"
          />
        </div>

        <CampaignImageUploadField
          value={bannerUrl}
          onChange={setBannerUrl}
          label="Campagneafbeelding"
          campaignName={name || "Campagne"}
          disabled={loading}
        />

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
          <label style={labelStyle}>Landen</label>
          <div style={{ position: "relative" }}>
            <input
              style={inputStyle}
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Zoek en voeg landen toe..."
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
          <label style={labelStyle}>Contenttypes</label>
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
          <label style={labelStyle}>Beschrijving</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Korte publieke campagnebeschrijving"
          />
        </div>

        <div>
          <label style={labelStyle}>Paginastatistieken</label>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px" }}>
            Kies de statistieken die verplicht zijn. Stel eventueel een minimumwaarde in.
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
          <label style={labelStyle}>Vereisten (een per regel)</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder={"Banner must appear in clip\nClickable link in bio"}
          />
        </div>

        <div>
          <label style={labelStyle}>Verplichte hashtags</label>
          <textarea
            style={{ ...inputStyle, minHeight: "72px", resize: "vertical" }}
            value={requiredHashtagsText}
            onChange={(e) => setRequiredHashtagsText(e.target.value)}
            placeholder="#tag per line"
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
            <label style={labelStyle}>Business CPM</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={businessCpmRaw}
              onChange={(e) => setBusinessCpmRaw(e.target.value)}
              placeholder="0.40"
            />
            {goalViews ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--text-muted, var(--text-secondary))" }}>Doelviews: {fmtViews(goalViews)}</p>
            ) : null}
            {!goalViews && businessCpmRaw ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--error, #dc2626)" }}>Vul een budget en Business CPM hoger dan 0 in</p>
            ) : null}
          </div>
          <div>
            <label style={labelStyle}>Jouw marge (€/1K views)</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={adminMarginPerK}
              onChange={(e) => setAdminMarginPerK(e.target.value)}
              placeholder="0.03"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Minimum betaalde views</label>
            <input
              style={inputStyle}
              value={minimumPaidViewsRaw}
              onChange={(e) => setMinimumPaidViewsRaw(e.target.value)}
              placeholder="e.g. 5k"
            />
            {minimumPaidViewsRaw && minimumPaidViews === null ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--error, #dc2626)" }}>Invalid - try: 5k, 5000</p>
            ) : null}
          </div>
          <div>
            <label style={labelStyle}>Maximum betaalde views</label>
            <input
              style={inputStyle}
              value={maximumPaidViewsRaw}
              onChange={(e) => setMaximumPaidViewsRaw(e.target.value)}
              placeholder="Leeg laten voor onbeperkt"
            />
            {maximumPaidViewsRaw && maximumPaidViews === null ? (
              <p style={{ fontSize: "11px", marginTop: "4px", color: "var(--error, #dc2626)" }}>Invalid - try: 100k, 500000</p>
            ) : null}
          </div>
        </div>

        {/* Economics preview */}
        {businessPerK > 0 && creatorPerK !== null && goalViews && (
          <div style={{ borderRadius: "8px", padding: "12px 14px", background: "var(--bg-secondary, var(--bg-primary))", border: "1px solid var(--border)", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
              <span>Klant betaalt (per 1K views)</span>
              <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>€{businessPerK.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--error, #dc2626)" }}>
              <span>Jouw marge</span>
              <span>−€{margin.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "6px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Creator verdient (per 1K views)</span>
              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>€{creatorPerK.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--accent, #534AB7)" }}>
              <span>Jouw omzet</span>
              <span>€{((margin / 1_000) * goalViews).toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Referral- / trackinglink</label>
          <input
            style={inputStyle}
            type="url"
            value={referralLink}
            onChange={(e) => setReferralLink(e.target.value)}
            placeholder="https://your-link.com?ref=xxx"
          />
        </div>

        <div>
          <label style={labelStyle}>Contentrichtlijnen</label>
          <textarea
            style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
            value={contentGuidelines}
            onChange={(e) => setContentGuidelines(e.target.value)}
            placeholder="Wat creators moeten opnemen: CTA's, hashtags, do's/don'ts..."
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
            <label style={labelStyle}>Startdatum</label>
            <input
              style={inputStyle}
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Max. creators</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              step="1"
              value={maxSlots}
              onChange={(e) => setMaxSlots(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted, var(--text-secondary))", marginBottom: "4px" }}>
            Assets
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Public links and content resources creators need for this campaign.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Bannervideo-URL</label>
            <input
              style={inputStyle}
              type="url"
              value={bannerVideoUrl}
              onChange={(e) => setBannerVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label style={labelStyle}>Brief-asset-URL</label>
            <input
              style={inputStyle}
              type="url"
              value={briefAssetUrl}
              onChange={(e) => setBriefAssetUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label style={labelStyle}>Richtlijnen-URL</label>
            <input
              style={inputStyle}
              type="url"
              value={guidelinesUrl}
              onChange={(e) => setGuidelinesUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <label style={labelStyle}>Contentasset-URL's</label>
            <textarea
              style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }}
              value={contentAssetUrlsText}
              onChange={(e) => setContentAssetUrlsText(e.target.value)}
              placeholder="Een URL per regel"
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted, var(--text-secondary))", marginBottom: "4px" }}>
            Targeting
          </p>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
            Publiekseisen die creators moeten kunnen controleren voordat ze zich aanmelden.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Doelland</label>
            <select
              style={inputStyle}
              value={targetCountry}
              onChange={(e) => setTargetCountry(e.target.value)}
            >
              <option value="">Geen doelland</option>
              {GEO_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Doelland-publiek (%)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              value={targetCountryPercent}
              onChange={(e) => setTargetCountryPercent(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Doelpubliek 18+ (%)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              value={targetMinAge18Percent}
              onChange={(e) => setTargetMinAge18Percent(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Doelpubliek man (%)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              value={targetMalePercent}
              onChange={(e) => setTargetMalePercent(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Minimum volgers</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="1"
              value={minFollowers}
              onChange={(e) => setMinFollowers(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Minimum engagementrate (%)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={minEngagementRate}
              onChange={(e) => setMinEngagementRate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Biovereiste</label>
            <input
              style={inputStyle}
              value={bioRequirement}
              onChange={(e) => setBioRequirement(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Link-in-bio-vereiste</label>
            <input
              style={inputStyle}
              value={linkInBioRequired}
              onChange={(e) => setLinkInBioRequired(e.target.value)}
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
          Opslaan als concept
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
          {loading ? "Maken..." : "Campagne lanceren"}
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
        >Annuleren</button>
      </div>
    </div>
  );
}
