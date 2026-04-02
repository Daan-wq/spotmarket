"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];

type Platform = "INSTAGRAM" | "TIKTOK" | "BOTH";

interface FormState {
  name: string;
  platform: Platform;
  description: string;
  contentGuidelines: string;
  referralLink: string;
  targetCountry: string;
  minEngagementRate: string;
  totalBudget: string;
  cpmUsd: string;
  deadline: string;
}

const DEFAULT_ADMIN_MARGIN_PER_M = 15; // $15 per million views platform fee

const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const lbl = "block text-sm font-medium text-gray-700 mb-1";
const card = "bg-white rounded-xl border border-gray-200 p-6 space-y-4";

export function AdvertiserCampaignForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    platform: "INSTAGRAM",
    description: "",
    contentGuidelines: "",
    referralLink: "",
    targetCountry: "US",
    minEngagementRate: "2",
    totalBudget: "",
    cpmUsd: "",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // Derived: estimated goal views from budget and CPM
  const budgetNum = parseFloat(form.totalBudget) || 0;
  const cpmNum = parseFloat(form.cpmUsd) || 0;
  const goalViews = cpmNum > 0 ? Math.floor((budgetNum / cpmNum) * 1000) : 0;
  const creatorCpv = cpmNum > 0 ? (cpmNum - DEFAULT_ADMIN_MARGIN_PER_M) / 1_000_000 : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/advertiser/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          goalViews: goalViews > 0 ? goalViews : undefined,
          creatorCpvPerM: cpmNum - DEFAULT_ADMIN_MARGIN_PER_M,
          adminMarginPerM: DEFAULT_ADMIN_MARGIN_PER_M,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create campaign");
      }

      const { checkoutUrl } = await res.json();
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        router.push("/advertiser/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Campaign details */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-gray-900">Campaign Details</h2>

        <div>
          <label className={lbl}>Campaign name *</label>
          <input className={inp} value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. BrandName Summer 2025" />
        </div>

        <div>
          <label className={lbl}>Platform *</label>
          <select className={inp} value={form.platform} onChange={e => set("platform", e.target.value as Platform)}>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="BOTH">Both</option>
          </select>
        </div>

        <div>
          <label className={lbl}>Campaign description</label>
          <textarea className={inp} rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What is this campaign about?" />
        </div>

        <div>
          <label className={lbl}>Content guidelines</label>
          <textarea className={inp} rows={4} value={form.contentGuidelines} onChange={e => set("contentGuidelines", e.target.value)} placeholder="What should creators include? Any required hashtags, CTAs, or restrictions?" />
        </div>

        <div>
          <label className={lbl}>Referral / tracking link</label>
          <input className={inp} value={form.referralLink} onChange={e => set("referralLink", e.target.value)} placeholder="https://yourbrand.com?ref=clipprofit" />
        </div>
      </div>

      {/* Targeting */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-gray-900">Targeting</h2>

        <div>
          <label className={lbl}>Primary target country *</label>
          <select className={inp} value={form.targetCountry} onChange={e => set("targetCountry", e.target.value)}>
            {GEO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className={lbl}>Min. engagement rate (%)</label>
          <input className={inp} type="number" step="0.1" min="0" max="100" value={form.minEngagementRate} onChange={e => set("minEngagementRate", e.target.value)} />
        </div>
      </div>

      {/* Budget */}
      <div className={card}>
        <h2 className="text-sm font-semibold text-gray-900">Budget</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Total budget (USD) *</label>
            <input className={inp} type="number" min="100" step="50" value={form.totalBudget} onChange={e => set("totalBudget", e.target.value)} required placeholder="e.g. 2000" />
          </div>
          <div>
            <label className={lbl}>CPM rate ($/1,000 views) *</label>
            <input className={inp} type="number" min="16" step="1" value={form.cpmUsd} onChange={e => set("cpmUsd", e.target.value)} required placeholder="e.g. 45" />
            <p className="text-xs mt-1 text-gray-400">Minimum $16/1,000 views</p>
          </div>
        </div>

        {goalViews > 0 && (
          <div className="rounded-lg p-4" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent)" }} >
            <p className="font-medium" style={{ color: "var(--accent-foreground)" }}>Estimated reach</p>
            <p style={{ color: "var(--accent)" }}>~{goalViews.toLocaleString()} verified views</p>
            <p className="text-xs" style={{ color: "var(--accent)" }}>Creator payout: ${((cpmNum - DEFAULT_ADMIN_MARGIN_PER_M) / 1000).toFixed(3)}/view · Platform fee: ${(DEFAULT_ADMIN_MARGIN_PER_M / 1000).toFixed(3)}/view</p>
          </div>
        )}

        <div>
          <label className={lbl}>Deadline *</label>
          <input className={inp} type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} required min={new Date().toISOString().slice(0, 10)} />
        </div>
      </div>

      {error && (
        <p className="text-sm px-4 py-3 rounded-lg" style={{ color: "#dc2626", background: "#fef2f2" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !form.name || !form.totalBudget || !form.cpmUsd || !form.deadline}
        className="w-full py-3 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: "var(--accent)" }}
      >
        {loading ? "Creating…" : "Create Campaign & Pay"}
      </button>

      <p className="text-xs text-center text-gray-400">
        You&apos;ll be redirected to checkout to fund your campaign budget. Once payment is confirmed, your campaign goes live automatically.
      </p>
    </form>
  );
}
