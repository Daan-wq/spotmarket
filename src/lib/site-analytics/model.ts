export const SITE_ANALYTICS_SEGMENT = "non_admin";

export type SiteAnalyticsGranularity = "hourly" | "daily";

export interface SiteAnalyticsMetrics {
  visitors: number;
  sessions: number;
  pageviews: number;
  signups: number;
  onboardingCompletions: number;
  signupConversionRate: number;
  onboardingCompletionRate: number;
}

export interface SiteAnalyticsTimePoint extends SiteAnalyticsMetrics {
  date: string;
}

export interface SiteAnalyticsTopPage {
  path: string;
  pageviews: number;
}

export interface SiteAnalyticsReferrer {
  source: string;
  visits: number;
}

export interface SiteAnalyticsFunnelStep {
  label: string;
  count: number;
  rate: number;
}

export interface SiteAnalyticsRecording {
  sessionId: string;
  lastSeenAt: string;
  path: string;
  href: string;
}

export interface SiteAnalyticsSnapshotPayload {
  granularity: SiteAnalyticsGranularity;
  segment: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: SiteAnalyticsMetrics;
  topPages: SiteAnalyticsTopPage[];
  referrers: SiteAnalyticsReferrer[];
  funnel: SiteAnalyticsFunnelStep[];
  recordings: SiteAnalyticsRecording[];
}

export const EMPTY_SITE_ANALYTICS_METRICS: SiteAnalyticsMetrics = {
  visitors: 0,
  sessions: 0,
  pageviews: 0,
  signups: 0,
  onboardingCompletions: 0,
  signupConversionRate: 0,
  onboardingCompletionRate: 0,
};

export function startOfHour(date: Date) {
  const next = new Date(date);
  next.setUTCMinutes(0, 0, 0);
  return next;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function calculateRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

export function buildMetrics(input: Partial<SiteAnalyticsMetrics>): SiteAnalyticsMetrics {
  const pageviews = toNumber(input.pageviews);
  const signups = toNumber(input.signups);
  const onboardingCompletions = toNumber(input.onboardingCompletions);

  return {
    visitors: toNumber(input.visitors),
    sessions: toNumber(input.sessions),
    pageviews,
    signups,
    onboardingCompletions,
    signupConversionRate: calculateRate(signups, pageviews),
    onboardingCompletionRate: calculateRate(onboardingCompletions, signups),
  };
}

export function sumMetrics(metrics: SiteAnalyticsMetrics[]): SiteAnalyticsMetrics {
  return buildMetrics({
    visitors: metrics.reduce((sum, item) => sum + item.visitors, 0),
    sessions: metrics.reduce((sum, item) => sum + item.sessions, 0),
    pageviews: metrics.reduce((sum, item) => sum + item.pageviews, 0),
    signups: metrics.reduce((sum, item) => sum + item.signups, 0),
    onboardingCompletions: metrics.reduce((sum, item) => sum + item.onboardingCompletions, 0),
  });
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizePath(value: unknown) {
  const raw = toStringValue(value);
  if (!raw) return "/";

  try {
    const url = new URL(raw);
    return `${url.pathname}${url.search}`;
  } catch {
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

export function normalizeReferrer(value: unknown) {
  const raw = toStringValue(value).trim();
  if (!raw) return "Direct";

  try {
    const url = new URL(raw);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^www\./, "");
  }
}

export function buildFunnel(metrics: SiteAnalyticsMetrics): SiteAnalyticsFunnelStep[] {
  return [
    { label: "Pageviews", count: metrics.pageviews, rate: 100 },
    { label: "Signups", count: metrics.signups, rate: metrics.signupConversionRate },
    {
      label: "Onboarding complete",
      count: metrics.onboardingCompletions,
      rate: metrics.onboardingCompletionRate,
    },
  ];
}

export function buildRecordingUrl(host: string, projectId: string, sessionId: string) {
  const cleanHost = host.replace(/\/$/, "");
  return `${cleanHost}/project/${projectId}/replay/${encodeURIComponent(sessionId)}`;
}
