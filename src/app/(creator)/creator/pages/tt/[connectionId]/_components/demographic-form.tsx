"use client";

import { useState, useTransition } from "react";
import { submitTikTokDemographics } from "./demographic-form-actions";

interface DemographicFormProps {
  connectionId: string;
  initialValues?: {
    topCountry: string;
    topCountryPercent: number;
    malePercent: number;
    ageBuckets: Record<string, number>;
  };
  readOnly?: boolean;
  pendingNote?: string;
}

const AGE_KEYS: { key: string; field: string; label: string }[] = [
  { key: "13-17", field: "age_13_17", label: "13-17" },
  { key: "18-24", field: "age_18_24", label: "18-24" },
  { key: "25-34", field: "age_25_34", label: "25-34" },
  { key: "35-44", field: "age_35_44", label: "35-44" },
  { key: "45-54", field: "age_45_54", label: "45-54" },
  { key: "55+", field: "age_55", label: "55+" },
];

export function DemographicForm({ connectionId, initialValues, readOnly, pendingNote }: DemographicFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [malePct, setMalePct] = useState(initialValues?.malePercent ?? 50);

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
      {pendingNote && (
        <div
          className="text-xs px-3 py-2 rounded-md"
          style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
        >
          {pendingNote}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>
            Top Country (ISO code)
          </label>
          <input
            name="topCountry"
            required
            maxLength={2}
            placeholder="US"
            disabled={readOnly}
            defaultValue={initialValues?.topCountry ?? ""}
            className="w-full px-3 py-2 rounded-md border text-sm uppercase"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide mb-1 block" style={{ color: "var(--text-muted)" }}>
            Top Country %
          </label>
          <input
            name="topCountryPercent"
            type="number"
            min={1}
            max={100}
            required
            disabled={readOnly}
            defaultValue={initialValues?.topCountryPercent ?? ""}
            className="w-full px-3 py-2 rounded-md border text-sm"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
          Gender (Male %)
        </label>
        <input
          name="malePercent"
          type="range"
          min={0}
          max={100}
          value={malePct}
          disabled={readOnly}
          onChange={(e) => setMalePct(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
          <span>Male {malePct}%</span>
          <span>Female {100 - malePct}%</span>
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
                disabled={readOnly}
                defaultValue={initialValues?.ageBuckets?.[a.key] ?? 0}
                className="w-full px-2 py-1.5 rounded-md border text-sm"
                style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div>
          <label className="text-xs uppercase tracking-wide mb-2 block" style={{ color: "var(--text-muted)" }}>
            Screen Recording (mp4/mov/webm, max 100 MB)
          </label>
          <input
            name="screenRecording"
            type="file"
            required
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
            className="block w-full text-sm"
            style={{ color: "var(--text-primary)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Record your TikTok analytics screen showing the same numbers you entered above.
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs" style={{ color: "var(--error-text)" }}>{error}</p>
      )}

      {!readOnly && (
        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: pending ? "var(--text-muted)" : "var(--primary)" }}
        >
          {pending ? "Submitting..." : "Submit for review"}
        </button>
      )}
    </form>
  );
}
