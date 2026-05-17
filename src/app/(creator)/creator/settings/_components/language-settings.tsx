"use client";

import { useEffect, useId, useState, useTransition, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import NLFlag from "country-flag-icons/react/3x2/NL";
import USFlag from "country-flag-icons/react/3x2/US";
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
  const listboxId = useId();
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedOption =
    LOCALE_OPTIONS.find((option) => option.locale === selectedLocale) ?? LOCALE_OPTIONS[0];

  useEffect(() => {
    setSelectedLocale(currentLocale);
  }, [currentLocale]);

  function handleLocaleChange(nextLocale: Locale) {
    if (nextLocale === selectedLocale || isPending) return;

    setSelectedLocale(nextLocale);
    setPendingLocale(nextLocale);
    setError(null);
    setSaved(false);
    setIsOpen(false);

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

  function handleDropdownKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-neutral-500">{description}</p>
        </div>

        <div
          className="relative w-full md:w-64"
          onBlur={(event) => {
            const nextFocus = event.relatedTarget;
            if (!(nextFocus instanceof Node) || !event.currentTarget.contains(nextFocus)) {
              setIsOpen(false);
            }
          }}
          onKeyDown={handleDropdownKeyDown}
        >
          <button
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            disabled={isPending}
            onClick={() => setIsOpen((open) => !open)}
            className="flex h-12 w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-left text-sm font-semibold text-neutral-950 transition hover:border-neutral-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-wait disabled:opacity-70"
          >
            <FlagIcon countryCode={selectedOption.countryCode} />
            <span className="min-w-0 flex-1 truncate">{selectedOption.label}</span>
            <span
              aria-hidden
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                pendingLocale ? "animate-pulse bg-neutral-400" : "bg-emerald-400",
              )}
            />
            <ChevronDown
              aria-hidden
              className={cn(
                "h-4 w-4 shrink-0 text-neutral-500 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </button>

          {isOpen && (
            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
            >
              {LOCALE_OPTIONS.map((option) => {
                const isSelected = selectedLocale === option.locale;

                return (
                  <button
                    key={option.locale}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={isPending}
                    onClick={() => {
                      if (isSelected) {
                        setIsOpen(false);
                        return;
                      }

                      handleLocaleChange(option.locale);
                    }}
                    className={cn(
                      "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:cursor-wait disabled:opacity-70",
                      isSelected
                        ? "bg-neutral-950 text-white"
                        : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                    )}
                  >
                    <FlagIcon countryCode={option.countryCode} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {isSelected ? (
                      <Check aria-hidden className="h-4 w-4 shrink-0" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
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

function FlagIcon({ countryCode }: { countryCode: string }) {
  const Icon = countryCode === "NL" ? NLFlag : USFlag;

  return (
    <span className="flex h-5 w-7 shrink-0 overflow-hidden rounded-[3px] border border-black/10 bg-white shadow-sm">
      <Icon aria-hidden className="h-full w-full" />
    </span>
  );
}
