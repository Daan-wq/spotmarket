export type ReportQualityStatus = "passed" | "passed_with_exclusions" | "needs_attention";

const COUNTRY_OVERRIDES: Record<string, string> = {
  XK: "Kosovo",
};

export function formatAudienceCountryLabel(code: string, locale = "nl-NL"): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return "Onbekend";
  if (COUNTRY_OVERRIDES[normalized]) return COUNTRY_OVERRIDES[normalized];

  try {
    const label = new Intl.DisplayNames([locale], { type: "region" }).of(normalized);
    return label ?? normalized;
  } catch {
    return normalized;
  }
}

export function formatAudienceShare(value: number, locale = "nl-NL"): string {
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function reportQualityStatusLabel(status: ReportQualityStatus): string {
  switch (status) {
    case "needs_attention":
      return "Aandacht nodig";
    case "passed_with_exclusions":
      return "Gecontroleerd met uitsluitingen";
    case "passed":
      return "Gecontroleerd";
  }
}
