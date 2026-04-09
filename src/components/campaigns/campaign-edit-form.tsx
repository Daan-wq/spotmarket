"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATFORM_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "X", label: "X" },
] as const;

const NICHE_OPTIONS = [
  { value: "MEMES", label: "Memes" },
  { value: "SPORT", label: "Sport" },
  { value: "CLIPS", label: "Clips" },
  { value: "GAMING", label: "Gaming" },
  { value: "LIFESTYLE", label: "Lifestyle" },
  { value: "FINANCE", label: "Finance" },
  { value: "OTHER", label: "Other" },
] as const;

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];

const inputStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

interface CampaignData {
  id: string;
  name: string;
  description?: string | null;
  contentGuidelines?: string | null;
  requirements?: string | null;
  referralLink?: string | null;
  targetCountry?: string | null;
  minEngagementRate?: number | null;
  bioRequirement?: string | null;
  linkInBioRequired?: string | null;
  totalBudget?: number | null;
  goalViews?: number | null;
  deadline?: string | null;
  maxSlots?: number | null;
  requiresApproval?: boolean;
  niche?: string | null;
  platforms?: string[];
  platform?: string;
}

interface CampaignEditFormProps {
  campaign: CampaignData;
  backUrl: string;
}

export function CampaignEditForm({ campaign, backUrl }: CampaignEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialPlatforms = campaign.platforms?.length
    ? campaign.platforms
    : campaign.platform && campaign.platform !== "BOTH"
      ? [campaign.platform]
      : [];

  const initialNiches = campaign.niche
    ? campaign.niche.split(", ").filter(Boolean)
    : [];

  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description ?? "");
  const [contentGuidelines, setContentGuidelines] = useState(campaign.contentGuidelines ?? "");
  const [requirements, setRequirements] = useState(campaign.requirements ?? "");
  const [referralLink, setReferralLink] = useState(campaign.referralLink ?? "");
  const [targetCountry, setTargetCountry] = useState(campaign.targetCountry ?? "US");
  const [minEngagementRate, setMinEngagementRate] = useState(
    campaign.minEngagementRate ? String(campaign.minEngagementRate) : ""
  );
  const [bioRequirement, setBioRequirement] = useState(campaign.bioRequirement ?? "");
  const [linkInBioRequired, setLinkInBioRequired] = useState(campaign.linkInBioRequired ?? "");
  const [totalBudget, setTotalBudget] = useState(campaign.totalBudget ? String(campaign.totalBudget) : "");
  const [goalViews, setGoalViews] = useState(campaign.goalViews ? String(campaign.goalViews) : "");
  const [deadline, setDeadline] = useState(
    campaign.deadline ? new Date(campaign.deadline).toISOString().slice(0, 10) : ""
  );
  const [maxSlots, setMaxSlots] = useState(campaign.maxSlots ? String(campaign.maxSlots) : "");
  const [requiresApproval, setRequiresApproval] = useState(campaign.requiresApproval ?? false);
  const [platforms, setPlatforms] = useState<string[]>(initialPlatforms);
  const [niches, setNiches] = useState<string[]>(initialNiches);
  const [nicheOther, setNicheOther] = useState("");

  async function handleSave() {
    if (!name.trim()) { setError("Campaign name is required"); return; }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          contentGuidelines: contentGuidelines || null,
          requirements: requirements || null,
          referralLink: referralLink || null,
          targetCountry,
          minEngagementRate: minEngagementRate ? parseFloat(minEngagementRate) : null,
          bioRequirement: bioRequirement || null,
          linkInBioRequired: linkInBioRequired || null,
          totalBudget: totalBudget ? parseFloat(totalBudget) : undefined,
          goalViews: goalViews ? parseInt(goalViews) : null,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          maxSlots: maxSlots ? parseInt(maxSlots) : null,
          requiresApproval,
          platforms,
          niche: niches.includes("OTHER")
            ? [...niches.filter(n => n !== "OTHER"), nicheOther || "OTHER"].join(", ")
            : niches.join(", "),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update campaign");
      }

      setSuccess(true);
      setTimeout(() => router.push(backUrl), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const labelStyle = "block text-sm font-medium mb-1";

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        {/* Campaign Brief */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Campaign Brief</h2>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Campaign name *</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(({ value, label }) => {
                const selected = platforms.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setPlatforms(prev =>
                        selected ? prev.filter(p => p !== value) : [...prev, value]
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "var(--accent-bg)" : "var(--bg-primary)",
                      color: selected ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Niche</label>
            <div className="flex flex-wrap gap-2">
              {NICHE_OPTIONS.map(({ value, label }) => {
                const selected = niches.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setNiches(prev =>
                        selected ? prev.filter(n => n !== value) : [...prev, value]
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style={{
                      border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                      background: selected ? "var(--accent-bg)" : "var(--bg-primary)",
                      color: selected ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {niches.includes("OTHER") && (
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mt-2"
                style={inputStyle}
                value={nicheOther}
                onChange={e => setNicheOther(e.target.value)}
                placeholder="Specify niche..."
              />
            )}
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Description</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Content guidelines</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={3}
              value={contentGuidelines}
              onChange={e => setContentGuidelines(e.target.value)}
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Requirements</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
              rows={2}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
            />
          </div>
        </section>

        {/* Targeting */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Targeting</h2>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Target country</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none cursor-pointer"
              style={inputStyle}
              value={targetCountry}
              onChange={e => setTargetCountry(e.target.value)}
            >
              {GEO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>
              Min. engagement rate (%) <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={minEngagementRate}
              onChange={e => setMinEngagementRate(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Bio requirement</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={bioRequirement}
              onChange={e => setBioRequirement(e.target.value)}
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Link in bio</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={linkInBioRequired}
              onChange={e => setLinkInBioRequired(e.target.value)}
            />
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Referral / tracking link</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              value={referralLink}
              onChange={e => setReferralLink(e.target.value)}
            />
          </div>
        </section>

        {/* Budget */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Budget & Timeline</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Total budget (USD)</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="100"
                step="50"
                value={totalBudget}
                onChange={e => setTotalBudget(e.target.value)}
              />
            </div>
            <div>
              <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Goal views</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="1000"
                step="1000"
                value={goalViews}
                onChange={e => setGoalViews(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Deadline</label>
            <input
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelStyle} style={{ color: "var(--text-primary)" }}>Max creators</label>
              <input
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
                type="number"
                min="1"
                value={maxSlots}
                onChange={e => setMaxSlots(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={e => setRequiresApproval(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Require approval</span>
              </label>
            </div>
          </div>
        </section>

        {/* Error / Success */}
        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "var(--error)", background: "var(--error-bg)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ color: "var(--success-text)", background: "var(--success-bg)" }}>
            Campaign updated! Redirecting...
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push(backUrl)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
