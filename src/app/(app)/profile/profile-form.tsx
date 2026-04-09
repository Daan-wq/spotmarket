"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GEO_OPTIONS = [
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "DE", label: "Germany" },
  { code: "GR", label: "Greece" },
  { code: "AU", label: "Australia" },
  { code: "CA", label: "Canada" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "FI", label: "Finland" },
  { code: "DK", label: "Denmark" },
  { code: "AT", label: "Austria" },
  { code: "CH", label: "Switzerland" },
];

const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

const inputStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

interface ProfileFormProps {
  profileId: string;
  initialData: {
    displayName: string;
    bio: string;
    walletAddress: string;
    tronsAddress: string;
    primaryGeo: string;
  };
}

export function ProfileForm({ profileId, initialData }: ProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function validate(): string | null {
    if (!form.displayName.trim()) return "Display name is required";
    if (form.walletAddress && !WALLET_REGEX.test(form.walletAddress)) {
      return "EVM wallet address must be a valid Ethereum address (0x...)";
    }
    if (form.tronsAddress && !TRON_REGEX.test(form.tronsAddress)) {
      return "Tron wallet must start with T and be 34 characters";
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/creators/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save profile");
      }

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Profile Details</p>
      </div>
      <div className="px-5 py-5 space-y-4" style={{ background: "var(--bg-elevated)" }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
            Display Name
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Your name or page name"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="Tell businesses about your page and audience"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
            Primary Audience Geo
          </label>
          <select
            value={form.primaryGeo}
            onChange={(e) => setForm({ ...form, primaryGeo: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {GEO_OPTIONS.map((g) => (
              <option key={g.code} value={g.code}>{g.label} ({g.code})</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>The country where most of your audience is located</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
            Crypto Wallet Address <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(for payouts)</span>
          </label>
          <input
            type="text"
            value={form.walletAddress}
            onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
            placeholder="0x..."
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>EVM-compatible wallet (Ethereum, Polygon, etc.). Required to receive creator payouts.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
            USDT Wallet (TRC-20 / Tron){" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(for campaign deposits &amp; refunds)</span>
          </label>
          <input
            type="text"
            value={form.tronsAddress}
            onChange={(e) => setForm({ ...form, tronsAddress: e.target.value.trim() })}
            placeholder="Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
            style={{
              ...inputStyle,
              borderColor: form.tronsAddress && !TRON_REGEX.test(form.tronsAddress) ? "#f87171" : undefined,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = form.tronsAddress && !TRON_REGEX.test(form.tronsAddress) ? "#f87171" : "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Required to launch campaigns. Unspent campaign budget is refunded here.</p>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#b91c1c", background: "#fef2f2" }}>
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#15803d", background: "#f0fdf4" }}>
            Profile saved successfully.
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--accent)" }}
          onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
