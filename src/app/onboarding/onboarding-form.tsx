"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [displayName, setDisplayName] = useState("");
  const [tronsAddress, setTronsAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tronsAddressValid = !tronsAddress || TRON_REGEX.test(tronsAddress);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    if (tronsAddress && !TRON_REGEX.test(tronsAddress)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          referralCode,
          tronsAddress: tronsAddress.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to set up account");
      }

      const data = await res.json();
      router.push(data.redirect ?? "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
          Your name or page name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. John or @mypagename"
          required
          autoFocus
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
          USDT wallet (TRC-20){" "}
          <span style={{ color: "var(--text-muted)" }}>(optional — required to launch campaigns)</span>
        </label>
        <input
          type="text"
          value={tronsAddress}
          onChange={(e) => setTronsAddress(e.target.value.trim())}
          placeholder="Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all font-mono"
          style={{
            border: `1px solid ${tronsAddress && !tronsAddressValid ? "#f87171" : "var(--border)"}`,
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = tronsAddress && !tronsAddressValid ? "#f87171" : "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-bg)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = tronsAddress && !tronsAddressValid ? "#f87171" : "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
        />
        {tronsAddress && !tronsAddressValid && (
          <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
            Invalid Tron address — must start with T and be 34 characters
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          You can also add this later in your profile.
        </p>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#b91c1c", background: "#fef2f2" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!displayName.trim() || loading || (!!tronsAddress && !tronsAddressValid)}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ background: "var(--accent)" }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
      >
        {loading ? "Setting up…" : "Get started"}
      </button>

      <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
        You can post for campaigns and launch your own campaigns — all from one account.
      </p>
    </form>
  );
}
