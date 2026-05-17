"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { LOCALE_OPTIONS, type Locale } from "@/i18n/routing";
import { updateCreatorLocale } from "../actions";

interface LanguageSettingsProps {
  currentLocale: Locale;
  title: string;
  description: string;
  ariaLabel: string;
  savedLabel: string;
  errorLabel: string;
}

export function LanguageSettings({
  currentLocale,
  title,
  description,
  ariaLabel,
  savedLabel,
  errorLabel,
}: LanguageSettingsProps) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === selectedLocale || isPending) return;

    setSelectedLocale(nextLocale);
    setPendingLocale(nextLocale);
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateCreatorLocale(nextLocale);

      if (!result.ok) {
        setSelectedLocale(currentLocale);
        setError(result.error ?? errorLabel);
        setPendingLocale(null);
        return;
      }

      setSaved(true);
      setPendingLocale(null);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>
        </div>

        <div
          role="radiogroup"
          aria-label={ariaLabel}
          className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto"
        >
          {LOCALE_OPTIONS.map((option) => {
            const isActive = selectedLocale === option.locale;
            const isSaving = pendingLocale === option.locale;

            return (
              <button
                key={option.locale}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isPending}
                onClick={() => handleLocaleChange(option.locale)}
                className={cn(
                  "flex h-12 min-w-40 items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-wait disabled:opacity-70",
                  isActive
                    ? "border-neutral-950 bg-neutral-950 text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                    : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-300 hover:bg-white",
                )}
              >
                <span aria-hidden className="text-xl leading-none">
                  {option.flag}
                </span>
                <span>{option.label}</span>
                <span
                  aria-hidden
                  className={cn(
                    "ml-auto h-2.5 w-2.5 rounded-full",
                    isSaving
                      ? "animate-pulse bg-current"
                      : isActive
                        ? "bg-emerald-300"
                        : "bg-neutral-300",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {(saved || error) && (
        <p
          className={cn(
            "mt-3 text-sm font-medium",
            error ? "text-red-600" : "text-emerald-700",
          )}
        >
          {error ?? savedLabel}
        </p>
      )}
    </section>
  );
}
