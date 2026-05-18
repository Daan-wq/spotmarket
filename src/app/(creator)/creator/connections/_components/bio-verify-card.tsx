"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { PlatformLogo } from "@clipprofit/platform-icons";

// NOTE: name kept for backwards compatibility with existing imports. The
// bio-verify path was deprecated by Subsystem A (tracking foundation) - this
// is now an OAuth-only connect card.

interface ConnectCardProps {
  brand: { name: string; platform: string };
  oauthHref: string;
  oauthAvailable: boolean;
  buttonLabel?: string;
  oauthWarning?: {
    platform: "FACEBOOK" | "INSTAGRAM";
    dismissed: boolean;
    title: string;
    description: string;
    continueLabel: string;
    doNotWarnLabel: string;
    cancelLabel: string;
    saveErrorLabel: string;
  };
}

export function BioVerifyCard({
  brand,
  oauthHref,
  oauthAvailable,
  buttonLabel,
  oauthWarning,
}: ConnectCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [warningOpen, setWarningOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const label = buttonLabel ?? `Connect ${brand.name}`;
  const shouldWarn = Boolean(oauthWarning && !oauthWarning.dismissed);

  useEffect(() => {
    if (!warningOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setWarningOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [warningOpen]);

  const continueToOAuth = () => {
    window.location.assign(oauthHref);
  };

  const dismissAndContinue = async () => {
    if (!oauthWarning) return;
    setSaving(true);
    setSaveError(false);

    try {
      const response = await fetch("/api/settings/connect-warning-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: oauthWarning.platform, dismissed: true }),
      });

      if (!response.ok) throw new Error("Preference save failed");
      continueToOAuth();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-lg border p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <PlatformLogo platform={brand.platform} alt={brand.name} size={36} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {brand.name}
          </p>
        </div>
      </div>

      {oauthAvailable ? (
        shouldWarn ? (
          <button
            type="button"
            onClick={() => {
              setSaveError(false);
              setWarningOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {label}
          </button>
        ) : (
          <a
            href={oauthHref}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {label}
          </a>
        )
      ) : (
        <button
          type="button"
          disabled
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border cursor-not-allowed opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-card)" }}
        >
          Coming soon
        </button>
      )}

      {warningOpen && oauthWarning ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <button
            className="absolute inset-0 cursor-default"
            type="button"
            aria-label={oauthWarning.cancelLabel}
            onClick={() => setWarningOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 id={titleId} className="text-base font-semibold tracking-normal text-neutral-950">
                  {oauthWarning.title}
                </h3>
                <p id={descriptionId} className="mt-2 text-sm leading-6 text-neutral-600">
                  {oauthWarning.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWarningOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 transition hover:bg-neutral-50"
                aria-label={oauthWarning.cancelLabel}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {oauthWarning.saveErrorLabel}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setWarningOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                {oauthWarning.cancelLabel}
              </button>
              <button
                type="button"
                onClick={dismissAndContinue}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:cursor-wait disabled:opacity-70"
              >
                {oauthWarning.doNotWarnLabel}
              </button>
              <button
                type="button"
                onClick={continueToOAuth}
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition"
                style={{ background: "var(--primary)" }}
              >
                {oauthWarning.continueLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
