export type ReportQualityStatus = "passed" | "passed_with_exclusions" | "needs_attention";
export type CampaignReportTemplateMode = "live" | "template";

const COUNTRY_OVERRIDES: Record<string, string> = {
  XK: "Kosovo",
};

const TOKEN_ALIASES: Record<string, string[]> = {
  "performance.currentViews": ["performance.approvedViews"],
  "performance.targetViews": ["campaign.goalViews"],
  "performance.targetViewsSource": ["campaign.goalViewsSource"],
  "performance.overdeliveryViews": ["financial.overdeliveryViews"],
  "performance.overdeliveryPercent": ["financial.overdeliveryRate"],
  "performance.deliveryProgress": ["performance.goalCompletion"],
  "performance.paidEligibleViews": ["financial.approvedPayableViews"],
  "performance.cpmPerThousand": ["campaign.creatorCpm", "performance.costPerThousandViews"],
  "performance.activeCreators": ["performance.uniqueCreators"],
  "audience.platformsLabel": ["campaign.platforms"],
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
  const numeric = Number(value) || 0;
  const percentage = numeric > 1 ? numeric : numeric * 100;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percentage)}%`;
}

export function audienceBarWidth(value: number): number {
  const numeric = Math.max(0, Number(value) || 0);
  const percentage = numeric > 1 ? numeric : numeric * 100;
  return Number(Math.min(100, percentage).toFixed(2));
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

export function resolveCampaignReportToken(name: string, source: unknown): unknown {
  const direct = resolveTokenPath(source, name);
  if (direct != null && direct !== "") return normalizeResolvedToken(name, direct);

  for (const alias of TOKEN_ALIASES[name] ?? []) {
    const value = resolveTokenPath(source, alias);
    if (value != null && value !== "") return normalizeResolvedToken(name, value);
  }

  return null;
}

export function renderCampaignReportTemplate(
  template: string,
  source: unknown,
  options: { mode: CampaignReportTemplateMode; locale?: string } = { mode: "live" },
): string {
  if (options.mode === "template") return template;

  return template.replace(/\{\{([^}]+)\}\}/g, (_, rawName: string) => {
    const name = rawName.trim();
    const value = resolveCampaignReportToken(name, source);
    return formatCampaignReportToken(name, value, options.locale ?? "nl-NL");
  });
}

export function formatCampaignReportToken(name: string, value: unknown, locale = "nl-NL"): string {
  if (value == null || value === "") return "geen waarde";
  if (typeof value === "boolean") return value ? "ja" : "nee";
  if (typeof value === "number") return formatTokenNumber(name, value, locale);
  if (typeof value === "string") return formatTokenString(value, locale);
  if (Array.isArray(value)) {
    if (value.length === 0) return "geen waarde";
    return joinDutch(value.map((item) => formatArrayItem(item, locale)));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "geen waarde";
    return entries
      .slice(0, 4)
      .map(([key, item]) => `${key}: ${formatCampaignReportToken(key, item, locale)}`)
      .join(", ");
  }
  return String(value);
}

function normalizeResolvedToken(name: string, value: unknown) {
  if (name === "audience.platformsLabel" && Array.isArray(value)) {
    return joinDutch(value.map((platform) => String(platform)));
  }
  return value;
}

function resolveTokenPath(source: unknown, path: string): unknown {
  let current = source;
  for (const segment of path.split(".")) {
    if (current == null) return null;
    const arrayMatch = segment.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      current = readObjectKey(current, arrayMatch[1]);
      if (!Array.isArray(current)) return null;
      current = current[Number(arrayMatch[2])];
      continue;
    }
    current = readObjectKey(current, segment);
  }
  return current;
}

function readObjectKey(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  return (value as Record<string, unknown>)[key];
}

function formatTokenNumber(name: string, value: number, locale: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("percent") || lowerName.includes("progress") || lowerName.includes("rate")) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value * 100)}%`;
  }
  if (
    lowerName.includes("budget") ||
    lowerName.includes("cost") ||
    lowerName.includes("cpm") ||
    lowerName.includes("cpv") ||
    lowerName.includes("cpa") ||
    lowerName.includes("amount")
  ) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatTokenString(value: string, locale: string) {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
    }
  }
  return value;
}

function formatArrayItem(value: unknown, locale: string) {
  if (value == null) return "geen waarde";
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("code" in record && "share" in record) {
      return `${formatAudienceCountryLabel(String(record.code), locale)}: ${formatAudienceShare(Number(record.share), locale)}`;
    }
    if ("platform" in record && "views" in record) {
      return `${String(record.platform)}: ${new Intl.NumberFormat(locale).format(Number(record.views) || 0)}`;
    }
    if ("creator" in record && "views" in record) {
      return `${String(record.creator)}: ${new Intl.NumberFormat(locale).format(Number(record.views) || 0)}`;
    }
  }
  return String(value);
}

function joinDutch(values: string[]) {
  if (values.length < 2) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} en ${values.at(-1)}`;
}
