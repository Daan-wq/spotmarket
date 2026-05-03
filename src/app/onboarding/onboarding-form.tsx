"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/onboarding/step-indicator";

const NICHES = ["Memes", "Sport", "Gaming", "Lifestyle", "Finance", "Tech", "Other"] as const;

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

interface FormData {
  attributionSource: string;
  attributionOther: string;
  displayName: string;
  niches: string[];
  nicheOther: string;
  experienceLevel: string;
}

const STEP_LABELS = ["Source", "Info", "Niche", "Experience", "Done"];
const TOTAL_STEPS = STEP_LABELS.length;
const FORM_STEPS = STEP_LABELS.length - 1; // last step is the completion screen

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    attributionSource: "",
    attributionOther: "",
    displayName: "",
    niches: [],
    nicheOther: "",
    experienceLevel: "",
  });

  function canProceed(): boolean {
    if (step === 1) return !!form.attributionSource && (form.attributionSource !== "Other" || !!form.attributionOther.trim());
    if (step === 2) return !!form.displayName.trim();
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const attribution = form.attributionSource === "Other"
        ? `Other: ${form.attributionOther.trim()}`
        : form.attributionSource;

      const niches = form.niches.includes("Other") && form.nicheOther.trim()
        ? [...form.niches.filter((n) => n !== "Other"), `Other: ${form.nicheOther.trim()}`]
        : form.niches;

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          referralCode,
          role: "creator",
          niches,
          attributionSource: attribution || undefined,
          experienceLevel: form.experienceLevel || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to complete setup");
      }
      // Advance to the completion screen instead of redirecting immediately —
      // gives the user a clear "what next" moment with explicit CTAs.
      setStep(TOTAL_STEPS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === FORM_STEPS) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors";
  const inputStyle = {
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    color: "#111827",
  };
  const labelClass = "block text-sm font-semibold mb-2 text-gray-800";

  return (
    <div>
      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

      {/* Step 1: Attribution */}
      {step === 1 && (
        <div>
          <p className="text-sm font-medium mb-4 text-gray-500">Where did you hear about us?</p>
          <div className="space-y-2">
            {ATTRIBUTION_SOURCES.map((source) => (
              <button
                key={source}
                onClick={() => setForm({ ...form, attributionSource: source, attributionOther: "" })}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                style={{
                  border: `2px solid ${form.attributionSource === source ? "var(--accent)" : "#e2e8f0"}`,
                  background: form.attributionSource === source ? "var(--accent-bg)" : "#fff",
                  color: form.attributionSource === source ? "var(--accent)" : "#374151",
                }}
              >
                {source}
              </button>
            ))}
          </div>
          {form.attributionSource === "Other" && (
            <input
              type="text"
              autoFocus
              value={form.attributionOther}
              onChange={(e) => setForm({ ...form, attributionOther: e.target.value })}
              placeholder="Tell us where..."
              className={`${inputClass} mt-3`}
              style={inputStyle}
            />
          )}
        </div>
      )}

      {/* Step 2: Basic Info */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Your name or page name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="e.g. John or @mypagename"
              required
              autoFocus
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Step 3: Niche Selection */}
      {step === 3 && (
        <div>
          <p className="text-sm font-medium mb-4 text-gray-500">What niche(s) do you create content for?</p>
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
                      nicheOther: selected && niche === "Other" ? "" : form.nicheOther,
                    })
                  }
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-colors cursor-pointer"
                  style={{
                    border: `1.5px solid ${selected ? "var(--accent)" : "#e2e8f0"}`,
                    background: selected ? "var(--accent-bg)" : "#fff",
                    color: selected ? "var(--accent)" : "#374151",
                  }}
                >
                  {niche}
                </button>
              );
            })}
          </div>
          {form.niches.includes("Other") && (
            <input
              type="text"
              autoFocus
              value={form.nicheOther}
              onChange={(e) => setForm({ ...form, nicheOther: e.target.value })}
              placeholder="Describe your niche..."
              className={`${inputClass} mt-4`}
              style={inputStyle}
            />
          )}
        </div>
      )}

      {/* Step 4: Experience Level */}
      {step === 4 && (
        <div>
          <p className="text-sm font-medium mb-4 text-gray-500">
            What&apos;s your content creation experience?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setForm({ ...form, experienceLevel: level.value })}
                className="p-4 rounded-xl text-left transition-colors cursor-pointer"
                style={{
                  border: `2px solid ${form.experienceLevel === level.value ? "var(--accent)" : "#e2e8f0"}`,
                  background: form.experienceLevel === level.value ? "var(--accent-bg)" : "#fff",
                }}
              >
                <p className="text-sm font-semibold text-gray-800">{level.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{level.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Completion */}
      {step === TOTAL_STEPS && (
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">You&apos;re set up</h2>
          <p className="mt-1.5 text-sm text-gray-600 max-w-sm mx-auto">
            Two more things unlock your first payout: connecting a social
            account and joining a campaign. Pick one to start.
          </p>

          <div className="mt-6 grid gap-2.5">
            <Link
              href="/creator/connections"
              className="block py-3 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "var(--accent)" }}
            >
              Connect a social account
            </Link>
            <Link
              href="/creator/campaigns"
              className="block py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{
                border: "1.5px solid #e2e8f0",
                color: "#374151",
                background: "#fff",
              }}
            >
              Browse campaigns
            </Link>
            <button
              type="button"
              onClick={() => router.push("/creator/dashboard")}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 mt-1"
            >
              Skip for now — go to dashboard
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm px-3 py-2 rounded-lg mt-4" style={{ color: "var(--error)", background: "var(--error-bg)" }}>
          {error}
        </p>
      )}

      {/* Navigation — hidden on the completion step (it has its own CTAs) */}
      {step < TOTAL_STEPS && (
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer text-gray-600 bg-gray-100 hover:bg-gray-200"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {loading ? "Setting up..." : step === FORM_STEPS ? "Get started" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
