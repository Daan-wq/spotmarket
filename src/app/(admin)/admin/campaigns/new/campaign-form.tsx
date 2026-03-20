"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];

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

      // If active, update status
      if (status === "active") {
        await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      }

      router.push(`/admin/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Campaign Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Casino X – Greece Q1 Push" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Referral Link *</label>
          <input type="url" value={form.referralLink} onChange={e => setForm({...form, referralLink: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://your-affiliate-link.com/ref/xxx" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Brief overview of the campaign goals" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content Guidelines</label>
          <textarea value={form.contentGuidelines} onChange={e => setForm({...form, contentGuidelines: e.target.value})}
            rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What creators must include: CTA, hashtags, disclosure, tone of voice, dos/don'ts..." />
        </div>
      </div>

      {/* Targeting */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Targeting Requirements</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Geo(s) *</label>
          <div className="flex flex-wrap gap-2">
            {GEO_OPTIONS.map(code => (
              <button key={code} type="button" onClick={() => toggleGeo(code)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  form.targetGeo.includes(code)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                }`}>
                {code}
              </button>
            ))}
          </div>
          {form.targetGeo.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">Selected: {form.targetGeo.join(", ")}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Followers</label>
            <input type="number" value={form.minFollowers} onChange={e => setForm({...form, minFollowers: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Engagement Rate (%)</label>
            <input type="number" step="0.1" value={form.minEngagementRate} onChange={e => setForm({...form, minEngagementRate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline *</label>
          <input type="datetime-local" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Budget & CPV */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Budget & Payouts</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Budget (USD) *</label>
            <input type="number" step="0.01" value={form.totalBudget} onChange={e => setForm({...form, totalBudget: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="5000.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creator CPV (USD/view) *</label>
            <input type="number" step="0.000001" value={form.creatorCpv} onChange={e => setForm({...form, creatorCpv: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.003000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Margin (USD/view)</label>
            <input type="number" step="0.000001" value={form.adminMargin} onChange={e => setForm({...form, adminMargin: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.001000" />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm text-gray-600">Business CPV (total charge/view)</p>
            <p className="text-xl font-bold text-gray-900 mt-1">${businessCpv}</p>
          </div>
        </div>

        {form.totalBudget && form.creatorCpv && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
            <p>Estimated max views: <strong className="text-gray-900">{Math.floor(parseFloat(form.totalBudget) / parseFloat(businessCpv.replace("—","0"))).toLocaleString()}</strong></p>
            <p>Creator pool: <strong className="text-gray-900">${(parseFloat(form.totalBudget) * parseFloat(form.creatorCpv) / parseFloat(businessCpv.replace("—","1"))).toFixed(2)}</strong></p>
            <p>Admin revenue: <strong className="text-gray-900">${(parseFloat(form.totalBudget) * parseFloat(form.adminMargin) / parseFloat(businessCpv.replace("—","1"))).toFixed(2)}</strong></p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => handleSubmit("draft")} disabled={loading}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
          Save as Draft
        </button>
        <button onClick={() => handleSubmit("active")} disabled={loading}
          className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? "Creating..." : "Launch Campaign"}
        </button>
      </div>
    </div>
  );
}
