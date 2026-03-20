"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];

const inputClass = "w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all";
const inputStyle = { border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" };
const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#4f46e5";
    e.currentTarget.style.boxShadow = "0 0 0 3px #eef2ff";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = "#e2e8f0";
    e.currentTarget.style.boxShadow = "none";
  },
};

interface FormState {
  name: string;
  description: string;
  contentGuidelines: string;
  referralLink: string;
  targetGeo: string[];
  minFollowers: string;
  minEngagementRate: string;
  totalBudget: string;
  creatorCpv: string;
  adminMargin: string;
  deadline: string;
}

export function CampaignForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    contentGuidelines: "",
    referralLink: "",
    targetGeo: [],
    minFollowers: "10000",
    minEngagementRate: "2",
    totalBudget: "",
    creatorCpv: "",
    adminMargin: "0.001",
    deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleGeo(code: string) {
    setForm((f) => ({
      ...f,
      targetGeo: f.targetGeo.includes(code)
        ? f.targetGeo.filter((g) => g !== code)
        : [...f.targetGeo, code],
    }));
  }

  const businessCpv = form.creatorCpv && form.adminMargin
    ? (parseFloat(form.creatorCpv) + parseFloat(form.adminMargin)).toFixed(6)
    : "—";

  async function handleSubmit(status: "draft" | "active") {
    if (!form.name || !form.referralLink || !form.targetGeo.length || !form.deadline || !form.creatorCpv || !form.totalBudget) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          minFollowers: parseInt(form.minFollowers),
          minEngagementRate: parseFloat(form.minEngagementRate),
          totalBudget: parseFloat(form.totalBudget),
          creatorCpv: parseFloat(form.creatorCpv),
          adminMargin: parseFloat(form.adminMargin),
          deadline: new Date(form.deadline).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create campaign");
      }

      const campaign = await res.json();

      if (status === "active") {
        await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      }

      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Campaign Details */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Campaign Details</p>
        </div>
        <div className="px-5 py-5 space-y-4" style={{ background: "#ffffff" }}>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Campaign Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Casino X – Greece Q1 Push"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Referral Link *</label>
            <input
              type="url"
              value={form.referralLink}
              onChange={(e) => setForm({ ...form, referralLink: e.target.value })}
              placeholder="https://your-affiliate-link.com/ref/xxx"
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Brief overview of the campaign goals"
              className={`${inputClass} resize-none`}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Content Guidelines</label>
            <textarea
              value={form.contentGuidelines}
              onChange={(e) => setForm({ ...form, contentGuidelines: e.target.value })}
              rows={4}
              placeholder="What creators must include: CTA, hashtags, disclosure, tone of voice, dos/don'ts..."
              className={`${inputClass} resize-none`}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>
        </div>
      </div>

      {/* Targeting */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Targeting Requirements</p>
        </div>
        <div className="px-5 py-5 space-y-4" style={{ background: "#ffffff" }}>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#374151" }}>Target Geo(s) *</label>
            <div className="flex flex-wrap gap-2">
              {GEO_OPTIONS.map((code) => {
                const active = form.targetGeo.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleGeo(code)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: active ? "#4f46e5" : "#f8fafc",
                      color: active ? "#ffffff" : "#64748b",
                      border: `1px solid ${active ? "#4f46e5" : "#e2e8f0"}`,
                    }}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
            {form.targetGeo.length > 0 && (
              <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>Selected: {form.targetGeo.join(", ")}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Min Followers</label>
              <input
                type="number"
                value={form.minFollowers}
                onChange={(e) => setForm({ ...form, minFollowers: e.target.value })}
                className={inputClass}
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Min Engagement Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.minEngagementRate}
                onChange={(e) => setForm({ ...form, minEngagementRate: e.target.value })}
                className={inputClass}
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Deadline *</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className={inputClass}
              style={inputStyle}
              {...focusHandlers}
            />
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Budget & Payouts</p>
        </div>
        <div className="px-5 py-5 space-y-4" style={{ background: "#ffffff" }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Total Budget (USD) *</label>
              <input
                type="number"
                step="0.01"
                value={form.totalBudget}
                onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                placeholder="5000.00"
                className={inputClass}
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Creator CPV (USD/view) *</label>
              <input
                type="number"
                step="0.000001"
                value={form.creatorCpv}
                onChange={(e) => setForm({ ...form, creatorCpv: e.target.value })}
                placeholder="0.003000"
                className={inputClass}
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>Admin Margin (USD/view)</label>
              <input
                type="number"
                step="0.000001"
                value={form.adminMargin}
                onChange={(e) => setForm({ ...form, adminMargin: e.target.value })}
                placeholder="0.001000"
                className={inputClass}
                style={inputStyle}
                {...focusHandlers}
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <p className="text-xs mb-1" style={{ color: "#64748b" }}>Business CPV (total charge/view)</p>
              <p className="text-xl font-semibold" style={{ color: "#0f172a" }}>${businessCpv}</p>
            </div>
          </div>

          {form.totalBudget && form.creatorCpv && (
            <div className="rounded-lg px-4 py-3 text-sm space-y-1" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <p style={{ color: "#64748b" }}>
                Estimated max views:{" "}
                <strong style={{ color: "#0f172a" }}>
                  {Math.floor(parseFloat(form.totalBudget) / parseFloat(businessCpv.replace("—", "0"))).toLocaleString()}
                </strong>
              </p>
              <p style={{ color: "#64748b" }}>
                Creator pool:{" "}
                <strong style={{ color: "#0f172a" }}>
                  ${(parseFloat(form.totalBudget) * parseFloat(form.creatorCpv) / parseFloat(businessCpv.replace("—", "1"))).toFixed(2)}
                </strong>
              </p>
              <p style={{ color: "#64748b" }}>
                Admin revenue:{" "}
                <strong style={{ color: "#0f172a" }}>
                  ${(parseFloat(form.totalBudget) * parseFloat(form.adminMargin) / parseFloat(businessCpv.replace("—", "1"))).toFixed(2)}
                </strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "#b91c1c", background: "#fef2f2" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ border: "1px solid #e2e8f0", color: "#374151", background: "#ffffff" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#ffffff"; }}
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit("active")}
          disabled={loading}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: "#4f46e5" }}
          onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.background = "#4338ca"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#4f46e5"; }}
        >
          {loading ? "Creating…" : "Launch Campaign"}
        </button>
      </div>
    </div>
  );
}
