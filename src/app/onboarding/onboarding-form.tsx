"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepIndicator } from "@/components/onboarding/step-indicator";

const TRON_REGEX = /^T[1-9A-HJ-NP-Z]{33}$/;

const NICHES = ["FINANCE", "TECH", "MOTIVATION", "FOOD", "HUMOR", "LIFESTYLE", "CASINO"] as const;

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
    value: "network",
    label: "Network",
    description: "I manage a network of content creators",
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
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

type Role = "creator" | "network" | "advertiser";

interface FormData {
  displayName: string;
  tronsAddress: string;
  role: Role | null;
  niches: string[];
  brandName: string;
  website: string;
  companyName: string;
  contactName: string;
}

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    displayName: "",
    tronsAddress: "",
    role: null,
    niches: [],
    brandName: "",
    website: "",
    companyName: "",
    contactName: "",
  });

  const tronsAddressValid = !form.tronsAddress || TRON_REGEX.test(form.tronsAddress);

  function getSteps(): { labels: string[]; total: number } {
    if (form.role === "creator") return { labels: ["Info", "Role", "Niche", "Connect"], total: 4 };
    if (form.role === "advertiser") return { labels: ["Info", "Role", "Brand"], total: 3 };
    if (form.role === "network") return { labels: ["Info", "Role", "Company"], total: 3 };
    return { labels: ["Info", "Role"], total: 2 };
  }

  const { labels, total } = getSteps();

  function canProceed(): boolean {
    if (step === 1) return !!form.displayName.trim() && tronsAddressValid;
    if (step === 2) return !!form.role;
    if (step === 3 && form.role === "advertiser") return !!form.brandName.trim();
    if (step === 3 && form.role === "network") return !!form.companyName.trim() && !!form.contactName.trim();
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
          brandName: form.brandName.trim() || undefined,
          website: form.website.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          contactName: form.contactName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to complete setup");
      }
      const data = await res.json();
      router.push(data.redirect ?? "/dashboard");
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

      {/* Step 1: Basic Info */}
      {step === 1 && (
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

      {/* Step 2: Role Selection */}
      {step === 2 && (
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

      {/* Step 3: Niche Selection (Creator) */}
      {step === 3 && form.role === "creator" && (
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

      {/* Step 4: Connect Platform (Creator) */}
      {step === 4 && form.role === "creator" && (
        <div className="text-center space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Connect your Instagram to start posting for campaigns
          </p>
          <a
            href="/api/auth/instagram?returnTo=/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: "var(--accent)" }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Connect Instagram
          </a>
          <button
            onClick={handleSubmit}
            className="block mx-auto text-xs cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            Skip for now
          </button>
        </div>
      )}

      {/* Step 3: Brand Info (Advertiser) */}
      {step === 3 && form.role === "advertiser" && (
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

      {/* Step 3: Company Info (Network) */}
      {step === 3 && form.role === "network" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Company name
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Your network or agency name"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--card-foreground)" }}>
              Contact name
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              placeholder="Your full name"
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
              placeholder="https://yournetwork.com"
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
      {!(step === 4 && form.role === "creator") && (
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
