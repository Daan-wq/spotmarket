"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "INSTAGRAM" | "TIKTOK" | "BOTH";

const CONTENT_TYPE_OPTIONS = ["Sports", "Memes", "Casino", "Lifestyle", "Crypto", "Finance", "Films/Series", "Influencer"];

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
  const [regions, setRegions] = useState("");           // stored in otherNotes
  const [platform, setPlatform] = useState<Platform>("BOTH");
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [requirements, setRequirements] = useState("");

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

  async function handleSubmit(status: "draft" | "active") {
    setError(null);

    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (!budget || budget <= 0) { setError("Budget must be a positive number"); return; }
    if (!deadline) { setError("Deadline is required"); return; }
    if (creatorPerM !== null && creatorPerM < 0) { setError("Margin too high — creator rate would be negative"); return; }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        platform,
        contentType: selectedContentTypes.length > 0 ? selectedContentTypes.join(" · ") : undefined,
        requirements: requirements || undefined,
        otherNotes: regions || undefined,           // regions stored here
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
          <label style={labelStyle}>Regions</label>
          <input
            style={inputStyle}
            value={regions}
            onChange={(e) => setRegions(e.target.value)}
            placeholder="e.g. Austria, Switzerland, Germany"
          />
        </div>

        <div>
          <label style={labelStyle}>Platforms *</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["INSTAGRAM", "TIKTOK", "BOTH"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: `1px solid ${platform === p ? "var(--accent, #534AB7)" : "var(--border)"}`,
                  background: platform === p ? "var(--accent, #534AB7)" : "var(--bg-card)",
                  color: platform === p ? "#fff" : "var(--text-secondary)",
                }}
              >
                {p === "INSTAGRAM" ? "Instagram" : p === "TIKTOK" ? "TikTok" : "Both"}
              </button>
            ))}
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
