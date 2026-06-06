"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CampaignImageUploadField } from "@/components/campaigns/campaign-image-upload-field";
import {
  buildCampaignEditPayload,
  calculateGoalViewsFromBudgetAndCpm,
  cpvToRatePerK,
  type CampaignEditFormState,
} from "@/lib/campaign-edit";

const PLATFORM_OPTIONS = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "YOUTUBE_SHORTS", label: "YouTube Shorts" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "X", label: "X" },
] as const;

const NICHE_OPTIONS = [
  "FINANCE",
  "TECH",
  "MOTIVATION",
  "FOOD",
  "HUMOR",
  "LIFESTYLE",
  "CASINO",
  "MEMES",
  "SPORT",
  "CLIPS",
  "GAMING",
  "OTHER",
] as const;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "pending_review", label: "Pending review" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const GEO_OPTIONS = [
  "US",
  "GB",
  "NL",
  "BE",
  "DE",
  "GR",
  "AU",
  "CA",
  "SE",
  "NO",
  "FI",
  "DK",
  "AT",
  "CH",
  "ES",
  "FR",
  "IT",
  "PT",
  "PL",
  "CZ",
  "HU",
  "RO",
  "BG",
  "HR",
  "SK",
  "SI",
  "EE",
  "LV",
  "LT",
  "MT",
  "CY",
  "LU",
  "IE",
];

const inputStyle: CSSProperties = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const controlClass = "w-full rounded-lg px-3 py-2.5 text-sm outline-none";
const labelClass = "block text-sm font-medium";

type NumericValue = number | string | null | undefined;

interface CampaignData {
  id: string;
  name: string;
  status?: string;
  brandId?: string | null;
  pricingTemplateId?: string | null;
  platforms?: string[];
  niche?: string | null;
  description?: string | null;
  contentType?: string | null;
  contentGuidelines?: string | null;
  requirements?: string | null;
  otherNotes?: string | null;
  pageStats?: string | null;
  minAge?: string | null;
  referralLink?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  briefAssetUrl?: string | null;
  guidelinesUrl?: string | null;
  contentAssetUrls?: string[];
  requiredHashtags?: string[];
  targetCountry?: string | null;
  targetCountryPercent?: number | null;
  targetMinAge18Percent?: number | null;
  targetMalePercent?: number | null;
  minFollowers?: number | null;
  minEngagementRate?: NumericValue;
  bioRequirement?: string | null;
  linkInBioRequired?: string | null;
  bioKeywords?: string[];
  totalBudget?: NumericValue;
  goalViews?: NumericValue;
  minimumPaidViews?: NumericValue;
  maximumPaidViews?: NumericValue;
  creatorCpv?: NumericValue;
  adminMargin?: NumericValue;
  deadline?: string | null;
  startsAt?: string | null;
  maxSlots?: number | null;
  requiresApproval?: boolean;
}

interface BrandOption {
  id: string;
  name: string;
  status: string;
}

interface PricingTemplateOption {
  id: string;
  name: string;
  price: NumericValue;
  currency: string;
  isActive: boolean;
}

interface CampaignEditFormProps {
  campaign: CampaignData;
  brands: BrandOption[];
  pricingTemplates: PricingTemplateOption[];
  backUrl: string;
}

export function CampaignEditForm({
  campaign,
  brands,
  pricingTemplates,
  backUrl,
}: CampaignEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<CampaignEditFormState>(() => ({
    name: campaign.name,
    status: campaign.status ?? "draft",
    brandId: campaign.brandId ?? "",
    pricingTemplateId: campaign.pricingTemplateId ?? "",
    platforms: campaign.platforms ?? [],
    niche: campaign.niche ?? "",
    description: campaign.description ?? "",
    contentType: campaign.contentType ?? "",
    contentGuidelines: campaign.contentGuidelines ?? "",
    requirements: campaign.requirements ?? "",
    otherNotes: campaign.otherNotes ?? "",
    pageStats: campaign.pageStats ?? "",
    minAge: campaign.minAge ?? "",
    referralLink: campaign.referralLink ?? "",
    bannerUrl: campaign.bannerUrl ?? null,
    bannerVideoUrl: campaign.bannerVideoUrl ?? "",
    briefAssetUrl: campaign.briefAssetUrl ?? "",
    guidelinesUrl: campaign.guidelinesUrl ?? "",
    contentAssetUrlsText: (campaign.contentAssetUrls ?? []).join("\n"),
    requiredHashtagsText: (campaign.requiredHashtags ?? []).join("\n"),
    targetCountry: campaign.targetCountry ?? "",
    targetCountryPercent: toInputValue(campaign.targetCountryPercent),
    targetMinAge18Percent: toInputValue(campaign.targetMinAge18Percent),
    targetMalePercent: toInputValue(campaign.targetMalePercent),
    minFollowers: toInputValue(campaign.minFollowers),
    minEngagementRate: toInputValue(campaign.minEngagementRate),
    bioRequirement: campaign.bioRequirement ?? "",
    linkInBioRequired: campaign.linkInBioRequired ?? "",
    bioKeywordsText: (campaign.bioKeywords ?? []).join("\n"),
    totalBudget: toInputValue(campaign.totalBudget),
    goalViews: toInputValue(campaign.goalViews),
    minimumPaidViews: toInputValue(campaign.minimumPaidViews),
    maximumPaidViews: toInputValue(campaign.maximumPaidViews),
    creatorRatePerK: toInputValue(cpvToRatePerK(campaign.creatorCpv)),
    adminMarginPerK: toInputValue(cpvToRatePerK(campaign.adminMargin)),
    deadline: toDateInput(campaign.deadline),
    startsAt: toDateInput(campaign.startsAt),
    maxSlots: toInputValue(campaign.maxSlots),
    requiresApproval: campaign.requiresApproval ?? false,
  }));

  const creatorRate = numberValue(form.creatorRatePerK);
  const adminMargin = numberValue(form.adminMarginPerK);
  const businessRate = creatorRate + adminMargin;
  const derivedGoalViews = calculateGoalViewsFromBudgetAndCpm(numberValue(form.totalBudget), businessRate);

  function setField<K extends keyof CampaignEditFormState>(
    field: K,
    value: CampaignEditFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function togglePlatform(value: string) {
    setForm((current) => ({
      ...current,
      platforms: current.platforms.includes(value)
        ? current.platforms.filter((platform) => platform !== value)
        : [...current.platforms, value],
    }));
  }

  async function handleSave() {
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCampaignEditPayload(form)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Campagne bijwerken mislukt");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => router.push(backUrl), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="space-y-8">
        <Section title="Campagne-inrichting">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Campagnenaam *">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
              />
            </Field>

            <Field label="Status">
              <select
                className={controlClass}
                style={inputStyle}
                value={form.status}
                onChange={(event) => setField("status", event.target.value)}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Brand">
              <select
                className={controlClass}
                style={inputStyle}
                value={form.brandId}
                onChange={(event) => setField("brandId", event.target.value)}
              >
                <option value="">No brand linked</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.status.toLowerCase()})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pricing template">
              <select
                className={controlClass}
                style={inputStyle}
                value={form.pricingTemplateId}
                onChange={(event) => setField("pricingTemplateId", event.target.value)}
              >
                <option value="">No pricing template</option>
                {pricingTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {formatTemplateLabel(template)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Platforms *">
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(({ value, label }) => {
                const selected = form.platforms.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => togglePlatform(value)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
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
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Niche">
              <select
                className={controlClass}
                style={inputStyle}
                value={form.niche}
                onChange={(event) => setField("niche", event.target.value)}
              >
                <option value="">No niche</option>
                {NICHE_OPTIONS.map((niche) => (
                  <option key={niche} value={niche}>
                    {titleCase(niche)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={(event) => setField("requiresApproval", event.target.checked)}
                />
                Require approval before creators can participate
              </label>
            </div>
          </div>
        </Section>

        <Section title="Creative And Brief">
          <CampaignImageUploadField
            value={form.bannerUrl}
            onChange={(value) => setField("bannerUrl", value)}
            label="Campaign image"
            campaignName={form.name || "Campaign"}
            disabled={loading}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Content type">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.contentType}
                onChange={(event) => setField("contentType", event.target.value)}
              />
            </Field>

            <Field label="Referral / tracking link">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.referralLink}
                onChange={(event) => setField("referralLink", event.target.value)}
                placeholder="https://..."
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className={controlClass}
              style={inputStyle}
              rows={3}
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </Field>

          <Field label="Requirements">
            <textarea
              className={controlClass}
              style={inputStyle}
              rows={3}
              value={form.requirements}
              onChange={(event) => setField("requirements", event.target.value)}
            />
          </Field>

          <Field label="Content guidelines">
            <textarea
              className={controlClass}
              style={inputStyle}
              rows={4}
              value={form.contentGuidelines}
              onChange={(event) => setField("contentGuidelines", event.target.value)}
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Other notes">
              <textarea
                className={controlClass}
                style={inputStyle}
                rows={3}
                value={form.otherNotes}
                onChange={(event) => setField("otherNotes", event.target.value)}
              />
            </Field>

            <Field label="Page stats">
              <textarea
                className={controlClass}
                style={inputStyle}
                rows={3}
                value={form.pageStats}
                onChange={(event) => setField("pageStats", event.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Minimum age">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.minAge}
                onChange={(event) => setField("minAge", event.target.value)}
                placeholder="e.g. 25+"
              />
            </Field>

            <Field label="Required hashtags">
              <textarea
                className={controlClass}
                style={inputStyle}
                rows={2}
                value={form.requiredHashtagsText}
                onChange={(event) => setField("requiredHashtagsText", event.target.value)}
                placeholder="#tag per line"
              />
            </Field>
          </div>
        </Section>

        <Section title="Assets">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Banner video URL">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.bannerVideoUrl}
                onChange={(event) => setField("bannerVideoUrl", event.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Brief asset URL">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.briefAssetUrl}
                onChange={(event) => setField("briefAssetUrl", event.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Guidelines URL">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.guidelinesUrl}
                onChange={(event) => setField("guidelinesUrl", event.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label="Content asset URLs">
              <textarea
                className={controlClass}
                style={inputStyle}
                rows={3}
                value={form.contentAssetUrlsText}
                onChange={(event) => setField("contentAssetUrlsText", event.target.value)}
                placeholder="One URL per line"
              />
            </Field>
          </div>
        </Section>

        <Section title="Targeting">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Target country">
              <select
                className={controlClass}
                style={inputStyle}
                value={form.targetCountry}
                onChange={(event) => setField("targetCountry", event.target.value)}
              >
                <option value="">No target country</option>
                {GEO_OPTIONS.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Target country audience (%)">
              <NumberInput
                value={form.targetCountryPercent}
                onChange={(value) => setField("targetCountryPercent", value)}
                min={0}
                max={100}
              />
            </Field>

            <Field label="Target 18+ audience (%)">
              <NumberInput
                value={form.targetMinAge18Percent}
                onChange={(value) => setField("targetMinAge18Percent", value)}
                min={0}
                max={100}
              />
            </Field>

            <Field label="Target male audience (%)">
              <NumberInput
                value={form.targetMalePercent}
                onChange={(value) => setField("targetMalePercent", value)}
                min={0}
                max={100}
              />
            </Field>

            <Field label="Minimum followers">
              <NumberInput
                value={form.minFollowers}
                onChange={(value) => setField("minFollowers", value)}
                min={0}
                step={1}
              />
            </Field>

            <Field label="Minimum engagement rate (%)">
              <NumberInput
                value={form.minEngagementRate}
                onChange={(value) => setField("minEngagementRate", value)}
                min={0}
                max={100}
                step={0.1}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Bio requirement">
              <textarea
                className={controlClass}
                style={{ ...inputStyle, minHeight: 112, resize: "vertical" }}
                value={form.bioRequirement}
                onChange={(event) => setField("bioRequirement", event.target.value)}
              />
            </Field>

            <Field label="Link in bio requirement">
              <input
                className={controlClass}
                style={inputStyle}
                value={form.linkInBioRequired}
                onChange={(event) => setField("linkInBioRequired", event.target.value)}
              />
            </Field>
          </div>

        </Section>

        <Section title="Budget, uitbetaling en planning">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Totaalbudget (EUR) *">
              <NumberInput
                value={form.totalBudget}
                onChange={(value) => setField("totalBudget", value)}
                min={0}
                step={0.01}
              />
            </Field>

            <Field label="Berekende doelviews">
              <input
                className={controlClass}
                style={inputStyle}
                value={derivedGoalViews ? derivedGoalViews.toLocaleString("nl-NL") : "-"}
                readOnly
              />
            </Field>

            <Field label="Minimum paid views">
              <NumberInput
                value={form.minimumPaidViews}
                onChange={(value) => setField("minimumPaidViews", value)}
                min={0}
                step={1}
              />
            </Field>

            <Field label="Maximum paid views">
              <NumberInput
                value={form.maximumPaidViews}
                onChange={(value) => setField("maximumPaidViews", value)}
                min={0}
                step={1}
              />
            </Field>

            <Field label="Creator CPM">
              <NumberInput
                value={form.creatorRatePerK}
                onChange={(value) => setField("creatorRatePerK", value)}
                min={0}
                step={0.01}
              />
            </Field>

            <Field label="Adminmarge CPM">
              <NumberInput
                value={form.adminMarginPerK}
                onChange={(value) => setField("adminMarginPerK", value)}
                min={0}
                step={0.01}
              />
            </Field>
          </div>

          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--bg-secondary, var(--bg-primary))", border: "1px solid var(--border)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span style={{ color: "var(--text-secondary)" }}>Business CPM</span>
              <span className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                €{businessRate.toFixed(2)} per 1K views
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Deadline *">
              <input
                className={controlClass}
                style={inputStyle}
                type="date"
                value={form.deadline}
                onChange={(event) => setField("deadline", event.target.value)}
              />
            </Field>

            <Field label="Start date">
              <input
                className={controlClass}
                style={inputStyle}
                type="date"
                value={form.startsAt}
                onChange={(event) => setField("startsAt", event.target.value)}
              />
            </Field>

            <Field label="Max creators">
              <NumberInput
                value={form.maxSlots}
                onChange={(value) => setField("maxSlots", value)}
                min={1}
                step={1}
              />
            </Field>
          </div>
        </Section>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--error)", background: "var(--error-bg)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ color: "var(--success-text)", background: "var(--success-bg)" }}>
            Campaign updated. Redirecting...
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(backUrl)}
            className="h-11 flex-1 rounded-lg text-sm font-medium transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !form.name.trim()}
            className="h-11 flex-1 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className={labelClass} style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = "any",
}: {
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <input
      className={controlClass}
      style={inputStyle}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function validateForm(state: CampaignEditFormState): string | null {
  if (!state.name.trim()) return "Campagnenaam is verplicht";
  if (state.platforms.length === 0) return "Selecteer minimaal een platform";
  if (!state.deadline) return "Deadline is verplicht";
  const positiveChecks: Array<[string, string]> = [["Totaalbudget", state.totalBudget]];
  for (const [label, value] of positiveChecks) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return `${label} moet hoger zijn dan 0`;
  }

  const percentageChecks: Array<[string, string]> = [
    ["Doellandpubliek", state.targetCountryPercent],
    ["18+ publiek", state.targetMinAge18Percent],
    ["Mannelijk publiek", state.targetMalePercent],
    ["Minimale engagementrate", state.minEngagementRate],
  ];
  for (const [label, value] of percentageChecks) {
    if (!value.trim()) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return `${label} moet tussen 0 en 100 liggen`;
    }
  }

  const nonNegativeChecks: Array<[string, string]> = [
    ["Minimum volgers", state.minFollowers],
    ["Minimum betaalde views", state.minimumPaidViews],
    ["Maximum betaalde views", state.maximumPaidViews],
    ["Creator CPM", state.creatorRatePerK],
    ["Adminmarge CPM", state.adminMarginPerK],
  ];
  for (const [label, value] of nonNegativeChecks) {
    if (!value.trim()) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return `${label} mag niet negatief zijn`;
  }

  const wholeNumberChecks: Array<[string, string]> = [
    ["Minimum betaalde views", state.minimumPaidViews],
    ["Maximum betaalde views", state.maximumPaidViews],
  ];
  for (const [label, value] of wholeNumberChecks) {
    if (!value.trim()) continue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed)) return `${label} moet een heel getal zijn`;
  }

  const positiveOptionalChecks: Array<[string, string]> = [
    ["Doelviews", state.goalViews],
    ["Maximum aantal creators", state.maxSlots],
  ];
  for (const [label, value] of positiveOptionalChecks) {
    if (!value.trim()) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return `${label} moet hoger zijn dan 0`;
  }

  if (state.maximumPaidViews.trim()) {
    const maximumPaidViews = Number(state.maximumPaidViews);
    const minimumPaidViews = state.minimumPaidViews.trim()
      ? Number(state.minimumPaidViews)
      : 0;
    if (
      Number.isFinite(maximumPaidViews) &&
      Number.isFinite(minimumPaidViews) &&
      maximumPaidViews < minimumPaidViews
    ) {
      return "Maximum betaalde views moet leeg zijn of minimaal gelijk zijn aan minimum betaalde views";
    }
  }

  return null;
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function toInputValue(value: NumericValue): string {
  if (value === null || value === undefined) return "";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  return Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(6)));
}

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTemplateLabel(template: PricingTemplateOption): string {
  const price = Number(template.price ?? 0);
  const suffix = template.isActive ? "" : " - inactive";
  return `${template.name} (${template.currency} ${price.toFixed(2)})${suffix}`;
}
