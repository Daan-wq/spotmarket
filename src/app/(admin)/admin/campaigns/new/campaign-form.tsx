"use client";

import { useState, useRef, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const GEO_OPTIONS = ["US","GB","NL","BE","DE","GR","AU","CA","SE","NO","FI","DK","AT","CH","ES","FR","IT","PT","PL","CZ","HU","RO","BG","HR","SK","SI","EE","LV","LT","MT","CY","LU","IE"];
const CONTENT_TYPES = ["Sports", "Memes", "Influencer", "Lifestyle", "Crypto", "Casino", "Other"] as const;
type Platform = "INSTAGRAM" | "TIKTOK" | "BOTH";

function parseViewsInput(input: string): number | null {
  const cleaned = input.trim().toLowerCase();
  const match = cleaned.match(/^([\d.,]+)\s*(k|m|b)?$/);
  if (!match) return null;
  const num = parseFloat(match[1].replace(",", "."));
  if (isNaN(num)) return null;
  const suffix = match[2];
  if (suffix === "k") return Math.round(num * 1_000);
  if (suffix === "m") return Math.round(num * 1_000_000);
  if (suffix === "b") return Math.round(num * 1_000_000_000);
  return Math.round(num);
}

function formatViews(views: number): string {
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B views`;
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}K views`;
  return `${views} views`;
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  adminMarginPerM: string;
  deadline: string;
  startsAt: string;
  referralLink: string;
  bannerUrl: string;
}

type FieldErrors = Partial<Record<keyof FormState | "general", string>>;

const inputStyle = { width: "100%", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none" } as const;
const inputErrStyle = { ...inputStyle, borderColor: "var(--error)", boxShadow: "0 0 0 2px var(--error-bg)" } as const;
const cardStyle = { background: "var(--bg-elevated)", borderRadius: "0.75rem", border: "1px solid var(--border)", padding: "1.5rem" } as const;

export function CampaignForm() {
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
    adminMarginPerM: "25",
    deadline: "",
    startsAt: "",
    referralLink: "",
    bannerUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function acceptBannerFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  function handleBannerDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptBannerFile(file);
  }

  async function uploadBanner(): Promise<string | null> {
    if (!bannerFile) return form.bannerUrl || null;
    setBannerUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = bannerFile.name.split(".").pop();
      const path = `banners/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("campaign-assets")
        .upload(path, bannerFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("campaign-assets").getPublicUrl(path);
      return data.publicUrl;
    } finally {
      setBannerUploading(false);
    }
  }

  const goalViews = parseViewsInput(form.goalViewsRaw);
  const budget = parseFloat(form.totalBudget) || 0;
  const adminMarginPerM = parseFloat(form.adminMarginPerM) || 0;
  const businessPerM = goalViews && budget > 0 ? (budget / goalViews) * 1_000_000 : null;
  const creatorPerM = businessPerM !== null ? businessPerM - adminMarginPerM : null;

  const economics =
    businessPerM !== null && creatorPerM !== null && goalViews
      ? {
          businessPerM,
          creatorPerM,
          adminRevenue: (adminMarginPerM / 1_000_000) * goalViews,
          maxCreatorPayout: (creatorPerM / 1_000_000) * goalViews,
        }
      : null;

  function validate(status: "draft" | "active"): FieldErrors {
    const errs: FieldErrors = {};
    if (!form.name.trim()) errs.name = "Campaign name is required";
    if (!form.platform) errs.platform = "Platform is required";
    if (!form.targetCountry) errs.targetCountry = "Target country is required";
    if (!form.totalBudget || budget <= 0) errs.totalBudget = "Budget must be greater than 0";
    if (!goalViews || goalViews <= 0) errs.goalViewsRaw = "Goal views is required";
    if (adminMarginPerM < 0) errs.adminMarginPerM = "Margin cannot be negative";
    if (creatorPerM !== null && creatorPerM < 0) errs.adminMarginPerM = "Margin too high — creator rate would be negative";
    if (status === "active") {
      if (!form.deadline) errs.deadline = "Deadline is required to launch";
      if (form.deadline && new Date(form.deadline) <= new Date()) errs.deadline = "Deadline must be in the future";
      if (form.startsAt && form.deadline && new Date(form.startsAt) >= new Date(form.deadline))
        errs.startsAt = "Start date must be before deadline";
    }
    return errs;
  }

  async function handleSubmit(status: "draft" | "active") {
    const errs = validate(status);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});

    try {
      const uploadedBannerUrl = await uploadBanner().catch((err) => {
        setErrors({ general: `Banner upload failed: ${err.message}` });
        setLoading(false);
        return null;
      });
      if (uploadedBannerUrl === null && bannerFile) return;

      const body = {
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
        adminMarginPerM,
        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        referralLink: form.referralLink || undefined,
        bannerUrl: uploadedBannerUrl || undefined,
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ general: data.error ?? "Failed to create campaign" });
        setLoading(false);
        return;
      }

      const campaign = await res.json();

      if (status === "active") {
        await fetch(`/api/campaigns/${campaign.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        });
      }

      router.push(`/admin/campaigns/${campaign.id}`);
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "Something went wrong" });
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Section 1: Campaign Details */}
      <div style={cardStyle} className="space-y-4">
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Campaign Details</h2>

        <div>
          <label className="form-label">Campaign Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            style={errors.name ? inputErrStyle : inputStyle}
            placeholder='e.g. "USA Sports Q1"'
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.name}</p>}
        </div>

        <div>
          <label className="form-label">Platform *</label>
          <div className="flex gap-2">
            {(["INSTAGRAM", "TIKTOK", "BOTH"] as Platform[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => set("platform", p)}
                style={form.platform === p ? { background: "var(--accent)", color: "#ffffff", borderColor: "var(--accent)", border: "1px solid var(--accent)" } : { background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border)", border: "1px solid var(--border)" }}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          {errors.platform && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.platform}</p>}
        </div>

        <div>
          <label className="form-label">Content Type</label>
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((ct) => {
              const val = ct.toLowerCase();
              return (
                <button
                  key={ct}
                  type="button"
                  onClick={() => set("contentType", form.contentType === val ? "" : val)}
                  style={form.contentType === val ? { background: "var(--accent)", color: "#ffffff", borderColor: "var(--accent)", border: "1px solid var(--accent)" } : { background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border)", border: "1px solid var(--border)" }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                >
                  {ct}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="form-label">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            style={inputStyle}
            className="resize-none"
            placeholder="Brief overview of campaign goals"
          />
        </div>

        <div>
          <label className="form-label">Content Guidelines</label>
          <textarea
            value={form.contentGuidelines}
            onChange={(e) => set("contentGuidelines", e.target.value)}
            rows={4}
            style={inputStyle}
            className="resize-none"
            placeholder="What creators must include: CTA, hashtags, disclosure, dos/don'ts..."
          />
        </div>

        <div>
          <label className="form-label">Requirements *</label>
          <input
            type="text"
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            style={inputStyle}
            placeholder="e.g. Banner + game link in bio"
          />
        </div>

        <div>
          <label className="form-label">Other Notes</label>
          <textarea
            value={form.otherNotes}
            onChange={(e) => set("otherNotes", e.target.value)}
            rows={3}
            style={inputStyle}
            className="resize-none"
            placeholder="Additional instructions..."
          />
        </div>
      </div>

      {/* Section 2: Audience Targeting */}
      <div style={cardStyle} className="space-y-4">
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Audience Targeting</h2>

        <div>
          <label className="form-label">Target Country *</label>
          <div className="flex flex-wrap gap-2">
            {GEO_OPTIONS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => set("targetCountry", form.targetCountry === code ? "" : code)}
                style={form.targetCountry === code ? { background: "var(--accent)", color: "#ffffff", borderColor: "var(--accent)", border: "1px solid var(--accent)" } : { background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border)", border: "1px solid var(--border)" }}
                className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              >
                {code}
              </button>
            ))}
          </div>
          {errors.targetCountry && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.targetCountry}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Min. Country Audience %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={form.targetCountryPercent}
                onChange={(e) => set("targetCountryPercent", e.target.value)}
                style={inputStyle}
                className="pr-8"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
          <div>
            <label className="form-label">Min. Age 18+ %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={form.targetMinAge18Percent}
                onChange={(e) => set("targetMinAge18Percent", e.target.value)}
                style={inputStyle}
                className="pr-8"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Min. Male %</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={form.targetMalePercent}
                onChange={(e) => set("targetMalePercent", e.target.value)}
                style={inputStyle}
                className="pr-8"
                placeholder="40 (optional)"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Min. Engagement Rate</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={form.minEngagementRate}
                onChange={(e) => set("minEngagementRate", e.target.value)}
                style={inputStyle}
                className="pr-8"
                placeholder="2"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>%</span>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Section 3: Budget & Goals */}
      <div style={cardStyle} className="space-y-4">
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Budget & Goals</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Total Budget *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>$</span>
              <input
                type="number"
                step="0.01"
                value={form.totalBudget}
                onChange={(e) => set("totalBudget", e.target.value)}
                style={errors.totalBudget ? inputErrStyle : inputStyle}
                className="pl-7"
                placeholder="15000"
              />
            </div>
            {errors.totalBudget && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.totalBudget}</p>}
          </div>
          <div>
            <label className="form-label">Goal Views *</label>
            <input
              type="text"
              value={form.goalViewsRaw}
              onChange={(e) => set("goalViewsRaw", e.target.value)}
              style={errors.goalViewsRaw ? inputErrStyle : inputStyle}
              placeholder="e.g. 200m, 500k, 1.5b"
            />
            {goalViews ? (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>= {formatViews(goalViews)}</p>
            ) : (
              form.goalViewsRaw && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>Invalid format. Try: 200m, 500k</p>
            )}
            {errors.goalViewsRaw && !form.goalViewsRaw && (
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.goalViewsRaw}</p>
            )}
          </div>
        </div>

        <div>
          <label className="form-label">Your Margin ($/1M views)</label>
          <div className="relative w-1/2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--text-muted)" }}>$</span>
            <input
              type="number"
              step="1"
              value={form.adminMarginPerM}
              onChange={(e) => set("adminMarginPerM", e.target.value)}
              style={errors.adminMarginPerM ? inputErrStyle : inputStyle}
              className="pl-7"
              placeholder="25"
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>How much you keep per 1 million views</p>
          {errors.adminMarginPerM && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.adminMarginPerM}</p>}
        </div>

        {economics && (
          <div style={{ background: "var(--bg-secondary)", borderRadius: "0.75rem", border: "1px solid var(--border)", padding: "1rem" }} className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Campaign Economics</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Client pays (per 1M views)</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>${economics.businessPerM.toFixed(2)}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--error)" }}>
                <span>Your margin</span>
                <span>−${adminMarginPerM.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5" style={{ borderTopColor: "var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Creator earns (per 1M views)</span>
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>${economics.creatorPerM.toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t pt-3 space-y-1 text-sm" style={{ borderTopColor: "var(--border)" }}>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Budget</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>${fmtUsd(budget)}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Goal</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{goalViews ? formatViews(goalViews) : "—"}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Max creator payout</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>${fmtUsd(economics.maxCreatorPayout)}</span>
              </div>
              <div className="flex justify-between font-medium" style={{ color: "var(--accent)" }}>
                <span>Your revenue</span>
                <span>${fmtUsd(economics.adminRevenue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 4: Schedule & Assets */}
      <div style={cardStyle} className="space-y-4">
        <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Schedule & Assets</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Deadline *</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              style={errors.deadline ? inputErrStyle : inputStyle}
            />
            {errors.deadline && <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.deadline}</p>}
          </div>
          <div>
            <label className="form-label">Start Date</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
              style={errors.startsAt ? inputErrStyle : inputStyle}
            />
            {errors.startsAt ? (
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>{errors.startsAt}</p>
            ) : (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Leave empty to start immediately</p>
            )}
          </div>
        </div>

        <div>
          <label className="form-label">Referral Link</label>
          <input
            type="url"
            value={form.referralLink}
            onChange={(e) => set("referralLink", e.target.value)}
            style={inputStyle}
            placeholder="https://your-affiliate-link.com/ref/xxx"
          />
        </div>

        <div>
          <label className="form-label">Banner Image</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleBannerDrop}
            onClick={() => fileInputRef.current?.click()}
            style={isDragOver ? { borderColor: "var(--accent)", background: "var(--accent-bg)" } : { borderColor: "var(--border)", background: "var(--bg-secondary)" }}
            className="relative cursor-pointer rounded-xl border-2 border-dashed transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptBannerFile(f); }}
            />
            {bannerPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full max-h-48 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setBannerFile(null); setBannerPreview(null); set("bannerUrl", ""); }}
                  className="absolute top-2 right-2 text-xs px-2 py-1 rounded-lg transition-colors"
                  style={{ background: "rgba(0, 0, 0, 0.6)", color: "#ffffff" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-8" style={{ color: "var(--text-muted)" }}>
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 19.5h16.5M13.5 6.75h.008v.008H13.5V6.75Z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Drop image here or click to browse</p>
                <p className="text-xs">PNG, JPG, GIF up to any size</p>
              </div>
            )}
            {bannerUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(255, 255, 255, 0.1)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>Uploading…</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {errors.general && (
        <p className="text-sm rounded-lg p-3 border" style={{ color: "var(--error-text)", background: "var(--error-bg)", borderColor: "var(--error)" }}>{errors.general}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 border"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--bg-card)" }}
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSubmit("active")}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ color: "#ffffff", background: "var(--accent)" }}
        >
          {loading ? "Creating..." : "Launch Campaign"}
        </button>
      </div>
    </div>
  );
}
