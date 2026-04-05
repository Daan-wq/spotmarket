"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/onboarding/step-indicator";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

const NICHES = ["FINANCE", "TECH", "MOTIVATION", "FOOD", "HUMOR", "LIFESTYLE", "CASINO"] as const;

const ATTRIBUTION_SOURCES = [
  "Google Search",
  "A friend or colleague",
  "Instagram",
  "TikTok",
  "Discord",
  "Twitter/X",
  "YouTube",
  "Other",
] as const;

const EXPERIENCE_LEVELS = [
  { value: "none", label: "No experience", description: "I'm just getting started" },
  { value: "some", label: "Some experience", description: "I've made a few videos" },
  { value: "experienced", label: "Experienced", description: "I create content regularly" },
  { value: "professional", label: "Professional", description: "This is my full-time job" },
] as const;

const ROLES = [
  {
    value: "creator",
    label: "Creator",
    description: "I create and post content for campaigns",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    value: "advertiser",
    label: "Advertiser",
    description: "I want to promote my brand through creators",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
    ),
  },
] as const;

type Role = "creator" | "advertiser";

interface FormData {
  attributionSource: string;
  displayName: string;
  tronsAddress: string;
  role: Role | null;
  niches: string[];
  experienceLevel: string;
  portfolioVideoUrl: string;
  brandName: string;
  website: string;
}

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    attributionSource: "",
    displayName: "",
    tronsAddress: "",
    role: null,
    niches: [],
    experienceLevel: "",
    portfolioVideoUrl: "",
    brandName: "",
    website: "",
  });

  const tronsAddressValid = !form.tronsAddress || TRON_REGEX.test(form.tronsAddress);

  function getSteps(): { labels: string[]; total: number } {
    if (form.role === "creator") return { labels: ["Source", "Info", "Role", "Niche", "Experience", "Portfolio"], total: 6 };
    if (form.role === "advertiser") return { labels: ["Source", "Info", "Role", "Brand"], total: 4 };
    return { labels: ["Source", "Info", "Role"], total: 3 };
  }

  const { labels, total } = getSteps();

  function canProceed(): boolean {
    if (step === 1) return !!form.attributionSource;
    if (step === 2) return !!form.displayName.trim() && tronsAddressValid;
    if (step === 3) return !!form.role;
    if (step === 4 && form.role === "advertiser") return !!form.brandName.trim();
    // Creator steps 4 (niche), 5 (experience), 6 (portfolio) are all optional
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          referralCode,
          tronsAddress: form.tronsAddress.trim() || undefined,
          role: form.role,
          niches: form.niches,
          attributionSource: form.attributionSource || undefined,
          experienceLevel: form.experienceLevel || undefined,
          portfolioVideoUrl: form.portfolioVideoUrl.trim() || undefined,
          brandName: form.brandName.trim() || undefined,
          website: form.website.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to complete setup");
      }
      const data = await res.json();
      router.push(data.redirect ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === total) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  }

  const inputStyle = {
    border: "1px solid var(--border)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
  };

  return (
    <div>
      <StepIndicator currentStep={step} totalSteps={total} labels={labels} />

      {/* Step 1: Attribution */}
      {step === 1 && (
        <div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Where did you hear about us?</p>
          <div className="space-y-2">
            {ATTRIBUTION_SOURCES.map((source) => (
              <button
                key={source}
                onClick={() => setForm({ ...form, attributionSource: source })}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer"
                style={{
                  border: `2px solid ${form.attributionSource === source ? "var(--accent)" : "var(--border)"}`,
                  background: form.attributionSource === source ? "var(--accent-bg)" : "var(--bg-primary)",
                  color: "var(--text-primary)",
                }}
              >
                {source}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Basic Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Your name or page name
            </label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. John or @mypagename"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              USDT wallet (TRC-20){" "}
              <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={form.tronsAddress}
              onChange={(e) => setForm({ ...form, tronsAddress: e.target.value.trim() })}
              placeholder="Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{
                ...inputStyle,
                borderColor: form.tronsAddress && !tronsAddressValid ? "var(--error)" : undefined,
              }}
            />
            {form.tronsAddress && !tronsAddressValid && (
              <p className="text-xs mt-1" style={{ color: "var(--error)" }}>Invalid Tron address</p>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Role Selection */}
      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>What describes you best?</p>
          {ROLES.map((role) => (
            <button
              key={role.value}
              onClick={() => setForm({ ...form, role: role.value as Role })}
              className="w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left cursor-pointer"
              style={{
                border: `2px solid ${form.role === role.value ? "var(--accent)" : "var(--border)"}`,
                background: form.role === role.value ? "var(--accent-bg)" : "var(--bg-primary)",
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: form.role === role.value ? "var(--accent)" : "var(--bg-secondary)",
                  color: form.role === role.value ? "#fff" : "var(--text-muted)",
                }}
              >
                {role.icon}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{role.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{role.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 4: Niche Selection (Creator) */}
      {step === 4 && form.role === "creator" && (
        <div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Select the niches you create content for</p>
          <div className="flex flex-wrap gap-2">
            {NICHES.map((niche) => {
              const selected = form.niches.includes(niche);
              return (
                <button
                  key={niche}
                  onClick={() =>
                    setForm({
                      ...form,
                      niches: selected
                        ? form.niches.filter((n) => n !== niche)
                        : [...form.niches, niche],
                    })
                  }
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    background: selected ? "var(--accent-bg)" : "var(--bg-primary)",
                    color: selected ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {niche.charAt(0) + niche.slice(1).toLowerCase()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Experience Level (Creator) */}
      {step === 5 && form.role === "creator" && (
        <div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            What&apos;s your content creation experience?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setForm({ ...form, experienceLevel: level.value })}
                className="p-4 rounded-xl text-left transition-colors cursor-pointer"
                style={{
                  border: `2px solid ${form.experienceLevel === level.value ? "var(--accent)" : "var(--border)"}`,
                  background: form.experienceLevel === level.value ? "var(--accent-bg)" : "var(--bg-primary)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{level.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{level.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 6: Portfolio Video Link (Creator) */}
      {step === 6 && form.role === "creator" && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Share a video of your work to help us match you with the right campaigns
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Video Link <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              type="url"
              value={form.portfolioVideoUrl}
              onChange={(e) => setForm({ ...form, portfolioVideoUrl: e.target.value })}
              placeholder="https://instagram.com/reel/... or https://tiktok.com/@username/video/..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              Preferably a video where you&apos;re speaking. Don&apos;t have one? No worries, you can skip this step!
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Brand Info (Advertiser) */}
      {step === 4 && form.role === "advertiser" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Brand name
            </label>
            <input
              type="text"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="Your brand or company name"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Website <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://yourbrand.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm px-3 py-2 rounded-lg mt-4" style={{ color: "var(--error)", background: "var(--error-bg)" }}>
          {error}
        </p>
      )}

      {/* Navigation buttons */}
      {(
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
          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Setting up..." : step === total ? "Get started" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
