"use client";

import { useState, useTransition } from "react";
import { submitTikTokDemographics } from "./demographic-form-actions";

interface CountryRow {
  iso: string;
  percent: number;
}

interface DemographicFormProps {
  connectionId: string;
  initialValues?: {
    topCountries: CountryRow[];
    malePercent: number;
    femalePercent: number;
    otherPercent: number;
    ageBuckets: Record<string, number>;
  };
  declineReason?: string;
}

const AGE_KEYS: { key: string; field: string; label: string }[] = [
  { key: "18-24", field: "age_18_24", label: "18-24" },
  { key: "25-34", field: "age_25_34", label: "25-34" },
  { key: "35-44", field: "age_35_44", label: "35-44" },
  { key: "45-54", field: "age_45_54", label: "45-54" },
  { key: "55+", field: "age_55", label: "55+" },
];

const COUNTRY_SLOTS = 5;

export function DemographicForm({ connectionId, initialValues, declineReason }: DemographicFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const [hasFile, setHasFile] = useState(false);

  const initialCountries: CountryRow[] = Array.from({ length: COUNTRY_SLOTS }, (_, i) => {
    const c = initialValues?.topCountries?.[i];
    return c ? { iso: c.iso, percent: c.percent } : { iso: "", percent: 0 };
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("connectionId", connectionId);
    startTransition(async () => {
      try {
        await submitTikTokDemographics(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {declineReason && (
        <div
          className="text-xs px-3 py-2 rounded-md"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
        >
          <span className="font-semibold">Previous submission declined: </span>
          {declineReason}
        </div>
      )}

      <div>
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
          Top 5 Countries (ISO code + %)
        </label>
        <div className="space-y-2">
          {initialCountries.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr] gap-2">
              <input
                name={`country_iso_${i}`}
                maxLength={2}
                placeholder={i === 0 ? "US (required)" : "ISO code"}
                required={i === 0}
                defaultValue={c.iso}
                className="w-full px-3 py-2 rounded-md border text-sm uppercase"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
              <input
                name={`country_pct_${i}`}
                type="number"
                min={0}
                max={100}
                step="0.1"
                placeholder={i === 0 ? "% (required)" : "%"}
                required={i === 0}
                defaultValue={c.percent || ""}
                className="w-full px-3 py-2 rounded-md border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          ))}
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          Top country is required. Add up to 4 more. Percentages should reflect TikTok Studio.
        </p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
          Gender (must sum to 100%)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Male</label>
            <input
              name="malePercent"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={initialValues?.malePercent ?? 50}
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Female</label>
            <input
              name="femalePercent"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={initialValues?.femalePercent ?? 50}
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>Other</label>
            <input
              name="otherPercent"
              type="number"
              min={0}
              max={100}
              required
              defaultValue={initialValues?.otherPercent ?? 0}
              className="w-full px-3 py-2 rounded-md border text-sm"
              style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
          Age (must sum to 100%)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {AGE_KEYS.map((a) => (
            <div key={a.key}>
              <label className="text-xs block mb-1" style={{ color: "var(--text-secondary)" }}>{a.label}</label>
              <input
                name={a.field}
                type="number"
                min={0}
                max={100}
                required
                defaultValue={initialValues?.ageBuckets?.[a.key] ?? 0}
                className="w-full px-2 py-1.5 rounded-md border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-md border px-3 py-3 space-y-2"
        style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Recording requirements
        </p>
        <ul className="text-xs space-y-1 pl-4 list-disc" style={{ color: "var(--text-secondary)" }}>
          <li>Start from your TikTok profile front page (profile name visible).</li>
          <li>Navigate to your statistics and show all data — age, gender, and countries.</li>
        </ul>
        <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: "var(--text-primary)" }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I confirm my recording follows these requirements. Recordings that don&rsquo;t start on the
            profile front page will be automatically declined.
          </span>
        </label>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
          Screen Recording (mp4/mov/webm/mkv, max 100 MB)
        </label>
        <input
          name="screenRecording"
          type="file"
          required
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={(e) => setHasFile((e.target.files?.length ?? 0) > 0)}
          className="block w-full text-sm"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--error-text)" }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={pending || !confirmed || !hasFile}
        className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:cursor-not-allowed"
        style={{
          background: pending || !confirmed || !hasFile ? "var(--text-muted)" : "var(--primary)",
          opacity: pending || !confirmed || !hasFile ? 0.6 : 1,
        }}
      >
        {pending ? "Submitting..." : "Submit for review"}
      </button>
    </form>
  );
}
