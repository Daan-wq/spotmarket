"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];
const CONTENT_TYPES = ["Sports", "Memes", "Influencer", "Lifestyle", "Crypto", "Casino", "Other"] as const;
type Platform = "INSTAGRAM" | "TIKTOK" | "BOTH";

function parseViewsInput(input: string): number | null {
  const cleaned = input.trim().toLowerCase();
  const match = cleaned.match(/^([\d.,]+)\s*(k|m|b)?$/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  if (isNaN(num)) return null;
  if (match[2] === "k") return Math.round(num * 1_000);
  if (match[2] === "m") return Math.round(num * 1_000_000);
  if (match[2] === "b") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function formatViews(views: number): string {
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

interface FormState {
  name: string;
  platform: Platform;
  contentType: string;
  description: string;
  contentGuidelines: string;
  requirements: string;
  otherNotes: string;
  targetCountry: string;
  targetCountryPercent: string;
  targetMinAge18Percent: string;
  targetMalePercent: string;
  minEngagementRate: string;
  totalBudget: string;
  goalViewsRaw: string;
  deadline: string;
  referralLink: string;
}

type FieldErrors = Partial<Record<keyof FormState | "general", string>>;

const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
const inpErr = "w-full px-3 py-2 border border-red-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400";
const lbl = "block text-sm font-medium text-gray-700 mb-1";
const card = "bg-white rounded-xl border border-gray-200 p-6 space-y-4";

export function LaunchCampaignForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    platform: "INSTAGRAM",
    contentType: "",
    description: "",
    contentGuidelines: "",
    requirements: "",
    otherNotes: "",
    targetCountry: "",
    targetCountryPercent: "20",
    targetMinAge18Percent: "20",
    targetMalePercent: "",
    minEngagementRate: "2",
    totalBudget: "",
    goalViewsRaw: "",
    deadline: "",
    referralLink: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  const goalViews = parseViewsInput(form.goalViewsRaw);
  const budget = parseFloat(form.totalBudget) || 0;

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.name.trim()) errs.name = "Campaign name is required";
    if (!form.totalBudget || budget <= 0) errs.totalBudget = "Budget must be greater than 0";
    if (!form.deadline) errs.deadline = "Deadline is required";
    if (form.deadline && new Date(form.deadline) <= new Date()) errs.deadline = "Deadline must be in the future";
    if (form.referralLink && !/^https?:\/\//.test(form.referralLink)) errs.referralLink = "Must start with https://";
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          platform: form.platform,
          contentType: form.contentType || undefined,
          description: form.description || undefined,
          contentGuidelines: form.contentGuidelines || undefined,
          requirements: form.requirements || undefined,
          otherNotes: form.otherNotes || undefined,
          targetCountry: form.targetCountry || undefined,
          targetCountryPercent: form.targetCountryPercent ? parseInt(form.targetCountryPercent) : undefined,
          targetMinAge18Percent: form.targetMinAge18Percent ? parseInt(form.targetMinAge18Percent) : undefined,
          targetMalePercent: form.targetMalePercent ? parseInt(form.targetMalePercent) : undefined,
          minEngagementRate: parseFloat(form.minEngagementRate) || 0,
          totalBudget: budget,
          goalViews: goalViews ?? undefined,
          deadline: new Date(form.deadline).toISOString(),
          referralLink: form.referralLink || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ general: data.error ?? "Failed to create campaign" });
        return;
      }

      const campaign = await res.json();
      router.push(`/launch/${campaign.id}/payment`);
    } catch {
      setErrors({ general: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campaign Details */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 text-base">Campaign Details</h2>

        <div>
          <label className={lbl}>Campaign name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={errors.name ? inpErr : inp}
            placeholder='e.g. "USA Sports Q2"'
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className={lbl}>Platform *</label>
          <div className="flex gap-2">
            {(["INSTAGRAM", "TIKTOK", "BOTH"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("platform", p)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  form.platform === p ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {p === "BOTH" ? "Both" : p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={lbl}>Content type</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((ct) => {
              const val = ct.toLowerCase();
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => set("contentType", form.contentType === val ? "" : val)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.contentType === val ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {ct}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={lbl}>Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Brief overview of campaign goals" />
        </div>

        <div>
          <label className={lbl}>Content guidelines</label>
          <textarea value={form.contentGuidelines} onChange={(e) => set("contentGuidelines", e.target.value)} rows={4} className={`${inp} resize-none`} placeholder="CTA, hashtags, disclosure, dos/don'ts…" />
        </div>

        <div>
          <label className={lbl}>Requirements</label>
          <input type="text" value={form.requirements} onChange={(e) => set("requirements", e.target.value)} className={inp} placeholder="e.g. Banner + game link in bio" />
        </div>

        <div>
          <label className={lbl}>Other notes</label>
          <textarea value={form.otherNotes} onChange={(e) => set("otherNotes", e.target.value)} rows={2} className={`${inp} resize-none`} placeholder="Additional instructions…" />
        </div>
      </div>

      {/* Audience Targeting */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 text-base">Audience Targeting</h2>

        <div>
          <label className={lbl}>Target country</label>
          <div className="flex flex-wrap gap-2">
            {GEO_OPTIONS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => set("targetCountry", form.targetCountry === code ? "" : code)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.targetCountry === code ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Min. country audience %</label>
            <div className="relative">
              <input type="number" min={0} max={100} value={form.targetCountryPercent} onChange={(e) => set("targetCountryPercent", e.target.value)} className={`${inp} pr-8`} placeholder="20" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Min. age 18+ %</label>
            <div className="relative">
              <input type="number" min={0} max={100} value={form.targetMinAge18Percent} onChange={(e) => set("targetMinAge18Percent", e.target.value)} className={`${inp} pr-8`} placeholder="20" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Min. male % <span className="text-gray-400 font-normal">(optional)</span></label>
            <div className="relative">
              <input type="number" min={0} max={100} value={form.targetMalePercent} onChange={(e) => set("targetMalePercent", e.target.value)} className={`${inp} pr-8`} placeholder="40" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className={lbl}>Min. engagement rate</label>
            <div className="relative">
              <input type="number" step="0.1" value={form.minEngagementRate} onChange={(e) => set("minEngagementRate", e.target.value)} className={`${inp} pr-8`} placeholder="2" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget & Goals */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 text-base">Budget & Goals</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Total budget (USDT) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input type="number" step="1" min="1" value={form.totalBudget} onChange={(e) => set("totalBudget", e.target.value)} className={`${errors.totalBudget ? inpErr : inp} pl-7`} placeholder="500" />
            </div>
            {errors.totalBudget && <p className="text-xs text-red-500 mt-1">{errors.totalBudget}</p>}
          </div>
          <div>
            <label className={lbl}>Goal views <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={form.goalViewsRaw} onChange={(e) => set("goalViewsRaw", e.target.value)} className={inp} placeholder="e.g. 10m, 500k" />
            {goalViews ? (
              <p className="text-xs text-gray-500 mt-1">= {formatViews(goalViews)}</p>
            ) : (
              form.goalViewsRaw && <p className="text-xs text-red-500 mt-1">Invalid format. Try: 10m, 500k</p>
            )}
          </div>
        </div>

        <div className="bg-amber-50 rounded-lg border border-amber-200 p-3 text-sm text-amber-800">
          You will send <strong>{budget > 0 ? `${budget} USDT` : "the full budget"}</strong> upfront to ClipProfit&apos;s wallet. After your campaign ends, any unspent budget is refunded to your Tron wallet.
        </div>
      </div>

      {/* Schedule & Links */}
      <div className={card}>
        <h2 className="font-semibold text-gray-900 text-base">Schedule & Links</h2>

        <div>
          <label className={lbl}>Campaign deadline *</label>
          <input type="datetime-local" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={errors.deadline ? inpErr : inp} />
          {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline}</p>}
        </div>

        <div>
          <label className={lbl}>Referral / affiliate link</label>
          <input type="url" value={form.referralLink} onChange={(e) => set("referralLink", e.target.value)} className={errors.referralLink ? inpErr : inp} placeholder="https://your-link.com/ref/xxx" />
          {errors.referralLink && <p className="text-xs text-red-500 mt-1">{errors.referralLink}</p>}
        </div>
      </div>

      {errors.general && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errors.general}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Creating campaign…" : "Continue to payment →"}
      </button>
    </form>
  );
}
