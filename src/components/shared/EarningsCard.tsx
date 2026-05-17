"use client";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/animate-ui/primitives/radix/tooltip";
import { formatCurrency } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface Props {
  amount: number;
  label?: string;
  /** When provided, renders an info icon next to the label that reveals this text on hover. */
  disclaimer?: string | null;
}

/**
 * Shared "Earned" card with optional disclaimer tooltip.
 *
 * Used on the submission detail page (per-video projected) and on the
 * My Clips list (total projected across all submissions). Pair the value
 * with one of the helpers from `@/lib/earnings`:
 *   - `submissionProjectedEarnings(s)` for a single submission
 *   - `totalProjectedEarnings(submissions)` for an aggregate
 */
export default function EarningsCard({
  amount,
  label,
  disclaimer,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("creator.shared");
  const displayLabel = label ?? t("labels.earned");

  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        <span>{displayLabel}</span>
        {disclaimer ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${displayLabel} disclaimer`}
                  className="inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                <div
                  className="max-w-xs px-3 py-2 rounded-lg text-xs leading-relaxed shadow-lg"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                >
                  {disclaimer}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
      <div className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
        {formatCurrency(amount, locale)}
      </div>
    </div>
  );
}
