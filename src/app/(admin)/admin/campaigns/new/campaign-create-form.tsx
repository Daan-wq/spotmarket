"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "6px",
  color: "var(--text-secondary)",
};

export function CampaignCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    totalBudget: "",
    description: "",        // used as "Regions"
    platform: "BOTH" as "INSTAGRAM" | "TIKTOK" | "BOTH",
    contentType: "",
    requirements: "",
    deadline: "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const budget = parseFloat(form.totalBudget);
    if (isNaN(budget) || budget <= 0) {
      setError("Budget must be a positive number");
      return;
    }
    if (!form.deadline) {
      setError("Deadline is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          description: form.description,
          contentType: form.contentType || undefined,
          requirements: form.requirements || undefined,
          totalBudget: budget,
          deadline: new Date(form.deadline).toISOString(),
          requiresApproval: false,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create campaign");
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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "600px" }}>
      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "8px", background: "var(--error-bg, #fecaca)", color: "var(--error-text, #dc2626)", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <div>
        <label style={labelStyle}>Campaign name *</label>
        <input
          style={inputStyle}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. LOGO CLIPPING DEAL"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Budget (€) *</label>
        <input
          style={inputStyle}
          type="number"
          min="1"
          step="any"
          value={form.totalBudget}
          onChange={(e) => set("totalBudget", e.target.value)}
          placeholder="e.g. 10000"
          required
        />
      </div>

      <div>
        <label style={labelStyle}>Regions</label>
        <input
          style={inputStyle}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g. Austria, Switzerland, Germany"
        />
      </div>

      <div>
        <label style={labelStyle}>Platforms *</label>
        <select
          style={inputStyle}
          value={form.platform}
          onChange={(e) => set("platform", e.target.value as typeof form.platform)}
          required
        >
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="BOTH">Instagram &amp; TikTok</option>
        </select>
      </div>

      <div>
        <label style={labelStyle}>Content types</label>
        <input
          style={inputStyle}
          value={form.contentType}
          onChange={(e) => set("contentType", e.target.value)}
          placeholder="e.g. Sports · Memes · Films/Series"
        />
      </div>

      <div>
        <label style={labelStyle}>Requirements (one per line)</label>
        <textarea
          style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }}
          value={form.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          placeholder={"Banner must appear in clip\nClickable link in bio"}
        />
      </div>

      <div>
        <label style={labelStyle}>Deadline *</label>
        <input
          style={inputStyle}
          type="date"
          value={form.deadline}
          onChange={(e) => set("deadline", e.target.value)}
          required
        />
      </div>

      <div style={{ display: "flex", gap: "12px", paddingTop: "4px" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 24px",
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
          {loading ? "Creating…" : "Create campaign"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            padding: "10px 24px",
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
    </form>
  );
}
