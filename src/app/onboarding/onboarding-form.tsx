"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to set up account");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
          Your name or page name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. John or @mypagename"
          required
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
          style={{ border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#4f46e5"; e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#b91c1c", background: "#fef2f2" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!displayName.trim() || loading}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ background: "#4f46e5" }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
      >
        {loading ? "Setting up…" : "Get started"}
      </button>

      <p className="text-xs text-center" style={{ color: "#94a3b8" }}>
        You can connect Instagram and set up payouts from your profile later.
      </p>
    </form>
  );
}
