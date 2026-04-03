"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepIndicator } from "@/components/onboarding/step-indicator";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];
const NICHES = ["FINANCE", "TECH", "MOTIVATION", "FOOD", "HUMOR", "LIFESTYLE", "CASINO"] as const;

type Platform = "INSTAGRAM" | "TIKTOK" | "BOTH";

interface FormState {
  name: string;
  platform: Platform;
  niche: string;
  description: string;
  contentGuidelines: string;
  referralLink: string;
  targetCountry: string;
  minEngagementRate: string;
  bioRequirement: string;
  linkInBioRequired: string;
  totalBudget: string;
  cpmUsd: string;
  deadline: string;
  maxSlots: string;
  requiresApproval: boolean;
  requirements: string;
}

const DEFAULT_ADMIN_MARGIN_PER_M = 15;
const STEP_LABELS = ["Brief", "Targeting", "Budget", "Review"];

const inputStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

export function AdvertiserCampaignForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    platform: "INSTAGRAM",
    niche: "",
    description: "",
    contentGuidelines: "",
    referralLink: "",
    targetCountry: "US",
    minEngagementRate: "2",
    bioRequirement: "",
    linkInBioRequired: "",
    totalBudget: "",
    cpmUsd: "",
    deadline: "",
    maxSlots: "",
    requiresApproval: false,
    requirements: "",
  });

  function set(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const budgetNum = parseFloat(form.totalBudget) || 0;
  const cpmNum = parseFloat(form.cpmUsd) || 0;
  const goalViews = cpmNum > 0 ? Math.floor((budgetNum / cpmNum) * 1000) : 0;

  function canProceed(): boolean {
    if (step === 1) return !!form.name.trim();
    if (step === 3) return !!form.totalBudget && !!form.cpmUsd && !!form.deadline;
    return true;
  }

  async function submitCampaign(asDraft: boolean) {
    setLoading(true);
    setError(null);

    try {
      const endpoint = asDraft ? "/api/campaigns" : "/api/advertiser/campaigns/create";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: asDraft ? "draft" : undefined,
          goalViews: goalViews > 0 ? goalViews : undefined,
          creatorCpvPerM: cpmNum - DEFAULT_ADMIN_MARGIN_PER_M,
          adminMarginPerM: DEFAULT_ADMIN_MARGIN_PER_M,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create campaign");
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
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
    <div className="max-w-xl">
      <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />

      {/* Step 1: Brief */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Campaign Brief</h2>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Campaign name *</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. BrandName Summer 2025"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Platform *</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={inputStyle}
              value={form.platform}
              onChange={e => set("platform", e.target.value as Platform)}
            >
              <option value="INSTAGRAM">Instagram</option>
              <option value="TIKTOK">TikTok</option>
              <option value="BOTH">Both</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Niche</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={inputStyle}
              value={form.niche}
              onChange={e => set("niche", e.target.value)}
            >
              <option value="">Select niche (optional)</option>
              {NICHES.map(n => <option key={n} value={n}>{n.charAt(0) + n.slice(1).toLowerCase()}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Description</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={3}
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="What is this campaign about?"
            />
          </div>
        </div>
      )}

      {/* Step 2: Targeting */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Targeting</h2>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Target country *</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={inputStyle}
              value={form.targetCountry}
              onChange={e => set("targetCountry", e.target.value)}
            >
              {GEO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Min. engagement rate (%)</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.minEngagementRate}
              onChange={e => set("minEngagementRate", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Bio requirement <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={form.bioRequirement}
              onChange={e => set("bioRequirement", e.target.value)}
              placeholder="Text creators must include in their bio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Link in bio <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={form.linkInBioRequired}
              onChange={e => set("linkInBioRequired", e.target.value)}
              placeholder="https://yourbrand.com/link"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Referral / tracking link <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={form.referralLink}
              onChange={e => set("referralLink", e.target.value)}
              placeholder="https://yourbrand.com?ref=clipprofit"
            />
          </div>
        </div>
      )}

      {/* Step 3: Budget */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Budget & Timeline</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Total budget (USD) *</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="100"
                step="50"
                value={form.totalBudget}
                onChange={e => set("totalBudget", e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>CPM rate ($/1K views) *</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="16"
                step="1"
                value={form.cpmUsd}
                onChange={e => set("cpmUsd", e.target.value)}
                placeholder="e.g. 45"
              />
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Min $16/1K views</p>
            </div>
          </div>

          {goalViews > 0 && (
            <div className="rounded-lg p-4" style={{ background: "var(--accent-bg)", border: "1px solid var(--accent)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                Estimated ~{goalViews.toLocaleString()} views
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Creator: ${((cpmNum - DEFAULT_ADMIN_MARGIN_PER_M)).toFixed(0)}/1K views &middot; Platform: ${DEFAULT_ADMIN_MARGIN_PER_M}/1K views
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Deadline *</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              type="date"
              value={form.deadline}
              onChange={e => set("deadline", e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                Max creators <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="1"
                value={form.maxSlots}
                onChange={e => set("maxSlots", e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={e => set("requiresApproval", e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Require approval</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Review Campaign</h2>

          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {[
              { label: "Name", value: form.name },
              { label: "Platform", value: form.platform },
              { label: "Niche", value: form.niche || "Not set" },
              { label: "Target country", value: form.targetCountry },
              { label: "Min. engagement", value: `${form.minEngagementRate}%` },
              { label: "Budget", value: `$${budgetNum.toLocaleString()}` },
              { label: "CPM", value: `$${cpmNum}/1K views` },
              { label: "Est. views", value: goalViews > 0 ? `~${goalViews.toLocaleString()}` : "N/A" },
              { label: "Deadline", value: form.deadline || "Not set" },
              { label: "Max creators", value: form.maxSlots || "Unlimited" },
              { label: "Approval", value: form.requiresApproval ? "Required" : "Open" },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className="flex justify-between px-4 py-2.5"
                style={{
                  borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                  background: i % 2 === 0 ? "var(--bg-elevated)" : "var(--bg-primary)",
                }}
              >
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </div>

          {form.description && (
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Description</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{form.description}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Content guidelines <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={3}
              value={form.contentGuidelines}
              onChange={e => set("contentGuidelines", e.target.value)}
              placeholder="What should creators include? Hashtags, CTAs, restrictions?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
              Requirements <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={2}
              value={form.requirements}
              onChange={e => set("requirements", e.target.value)}
              placeholder="Any additional requirements for creators"
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm px-3 py-2 rounded-lg mt-4" style={{ color: "var(--error)", background: "var(--error-bg)" }}>{error}</p>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            Next
          </button>
        ) : (
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => submitCampaign(true)}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              {loading ? "..." : "Save Draft"}
            </button>
            <button
              onClick={() => submitCampaign(false)}
              disabled={loading || !form.name || !form.totalBudget || !form.cpmUsd || !form.deadline}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "Creating..." : "Submit & Pay"}
            </button>
          </div>
        )}
      </div>

      {step === 4 && (
        <p className="text-xs text-center mt-3" style={{ color: "var(--text-muted)" }}>
          Submit & Pay redirects to checkout. Save Draft saves without payment.
        </p>
      )}
    </div>
  );
}
