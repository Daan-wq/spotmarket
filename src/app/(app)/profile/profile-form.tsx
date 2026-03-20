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

const inputStyle = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
};

interface ProfileFormProps {
  profileId: string;
  initialData: {
    displayName: string;
    bio: string;
    walletAddress: string;
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
      return "Wallet address must be a valid Ethereum address (0x...)";
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
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
      <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Profile Details</p>
      </div>
      <div className="px-5 py-5 space-y-4" style={{ background: "#ffffff" }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Display Name
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Your name or page name"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="Tell businesses about your page and audience"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Primary Audience Geo
          </label>
          <select
            value={form.primaryGeo}
            onChange={(e) => setForm({ ...form, primaryGeo: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
          >
            {GEO_OPTIONS.map((g) => (
              <option key={g.code} value={g.code}>{g.label} ({g.code})</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>The country where most of your audience is located</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            Crypto Wallet Address <span style={{ color: "#94a3b8", fontWeight: 400 }}>(for payouts)</span>
          </label>
          <input
            type="text"
            value={form.walletAddress}
            onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
            placeholder="0x..."
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>EVM-compatible wallet (Ethereum, Polygon, etc.). Required to receive payouts.</p>
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
          style={{ background: "#4f46e5" }}
          onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
