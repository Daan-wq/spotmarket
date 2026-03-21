"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function OnboardingForm() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<"creator" | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !selectedRole) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), role: selectedRole }),
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

  if (!selectedRole) {
    return (
      <div className="space-y-4">
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>
          What type of account do you want to set up?
        </p>

        <button
          type="button"
          onClick={() => setSelectedRole("creator")}
          className="w-full p-4 border-2 rounded-lg text-left transition-all"
          style={{ borderColor: "#e2e8f0" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5"; (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <p className="font-semibold" style={{ color: "#0f172a" }}>Creator</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Earn from campaigns and sponsorships</p>
        </button>

        <Link href="/onboarding/network">
          <button
            type="button"
            className="w-full p-4 border-2 rounded-lg text-left transition-all"
            style={{ borderColor: "#e2e8f0" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#4f46e5"; (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <p className="font-semibold" style={{ color: "#0f172a" }}>Network Owner</p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>Manage a creator network</p>
          </button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <button
        type="button"
        onClick={() => setSelectedRole(null)}
        className="text-sm mb-4"
        style={{ color: "#4f46e5" }}
      >
        ← Back
      </button>

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
          autoFocus
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
