"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Niche } from "@prisma/client";
import { NicheSelector } from "@/components/admin/NicheSelector";
import { createScoutedPage } from "../actions";
import { NICHE_CONFIG } from "@/lib/niches";

const NICHE_MONETIZATION: Record<Niche, number> = {
  FINANCE: 100, TECH: 90, MOTIVATION: 70,
  FOOD: 65, HUMOR: 60, LIFESTYLE: 55, CASINO: 40,
};

function computePreviewScore(
  eng: number, growth: number, niche: Niche | null,
  freq: number, auth: number
) {
  if (!niche) return null;
  const engScore = Math.min((eng / 5) * 100, 100);
  const growthScore = Math.min((growth / 10) * 100, 100);
  const nicheScore = NICHE_MONETIZATION[niche];
  const contentScore = Math.min((freq / 7) * 100, 100);
  const authScore = Math.min(auth, 100);
  return Math.round(
    engScore * 0.3 + growthScore * 0.25 + nicheScore * 0.2 + contentScore * 0.15 + authScore * 0.1
  );
}

export default function NewScoutPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [niche, setNiche] = useState<Niche | null>(null);
  const [followers, setFollowers] = useState("");
  const [engagement, setEngagement] = useState("");
  const [growth, setGrowth] = useState("");
  const [freq, setFreq] = useState("");
  const [authenticity, setAuthenticity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previewScore = computePreviewScore(
    parseFloat(engagement) || 0,
    parseFloat(growth) || 0,
    niche,
    parseFloat(freq) || 0,
    parseFloat(authenticity) || 0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!niche) { setError("Selecteer een niche"); return; }
    setLoading(true);
    setError("");
    try {
      await createScoutedPage({
        instagramHandle: handle.replace("@", ""),
        niche,
        followerCount: parseInt(followers) || 0,
        engagementRate: parseFloat(engagement) || 0,
        monthlyGrowthPct: parseFloat(growth) || 0,
        contentFreqPerWeek: parseFloat(freq) || 0,
        authenticityScore: parseFloat(authenticity) || 0,
        notes: notes || undefined,
      });
      router.push("/admin/scouting");
    } catch {
      setError("Er is iets misgegaan. Probeer opnieuw.");
      setLoading(false);
    }
  }

  const scoreColor = previewScore == null ? "var(--text-muted)"
    : previewScore >= 70 ? "var(--success)"
    : previewScore >= 50 ? "var(--warning-text)"
    : "var(--error-text)";

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/scouting" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Terug naar Scouting
      </Link>
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Scout nieuwe page</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Minimale score voor signing: <strong>70/100</strong>
      </p>

      {previewScore !== null && (
        <div
          className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between"
          style={{ background: "var(--bg-primary)", border: `2px solid ${scoreColor}` }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>SCORECARD PREVIEW</p>
            <p className="text-3xl font-bold mt-0.5" style={{ color: scoreColor }}>{previewScore}/100</p>
          </div>
          <p className="text-sm" style={{ color: scoreColor }}>
            {previewScore >= 70 ? "✓ Voldoet aan signing-criterium" : previewScore >= 50 ? "⚠️ Marginaal — overweeg te passen" : "✗ Voldoet niet aan criterium"}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Instagram handle</label>
          <input
            type="text"
            placeholder="@handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Niche (20% gewicht)</label>
          <NicheSelector value={niche} onChange={setNiche} includeEmpty />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Followers</label>
            <input
              type="number"
              placeholder="50000"
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
              Engagement rate % <span className="text-xs text-gray-400">(30% gewicht)</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="3.2"
              value={engagement}
              onChange={(e) => setEngagement(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {niche && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Benchmark {NICHE_CONFIG[niche].label}: ~3–5% voor micro accounts
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
              Maandelijkse groei % <span className="text-xs text-gray-400">(25% gewicht)</span>
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="5"
              value={growth}
              onChange={(e) => setGrowth(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>10%+/maand = high-potential</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
              Posts per week <span className="text-xs text-gray-400">(15% gewicht)</span>
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="4"
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>IG doel: 3–4/week, TikTok: dagelijks</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>
            Authenticiteit score 0–100 <span className="text-xs text-gray-400">(10% gewicht)</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="85"
            value={authenticity}
            onChange={(e) => setAuthenticity(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Schat in via HypeAuditor of vergelijkbaar tool</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#374151" }}>Notities (optioneel)</label>
          <textarea
            rows={3}
            placeholder="Eerste indruk, bijzonderheden..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors text-white"
          style={{ background: "var(--text-primary)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Opslaan..." : "Page toevoegen aan scouting pipeline"}
        </button>
      </form>
    </div>
  );
}
