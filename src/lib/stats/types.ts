import type { ConnectionType } from "@prisma/client";

export type PlatformSlug = "ig" | "tt" | "yt" | "fb";

export const PLATFORM_LABEL: Record<PlatformSlug, string> = {
  ig: "Instagram",
  tt: "TikTok",
  yt: "YouTube",
  fb: "Facebook",
};

export const PLATFORM_COLOR: Record<PlatformSlug, string> = {
  ig: "#E1306C",
  tt: "#010101",
  yt: "#FF0000",
  fb: "#1877F2",
};

export const PLATFORM_ALL: PlatformSlug[] = ["ig", "tt", "yt", "fb"];

export function slugToConnectionType(slug: PlatformSlug): ConnectionType {
  return slug.toUpperCase() as ConnectionType;
}

export function connectionTypeToSlug(type: ConnectionType): PlatformSlug {
  return type.toLowerCase() as PlatformSlug;
}

export function isPlatformSlug(value: string | undefined): value is PlatformSlug {
  return value === "ig" || value === "tt" || value === "yt" || value === "fb";
}

// Map MetricSource → platform slug for filtering submissions by platform
// (CampaignSubmission lacks a YT enum value in BioPlatform, so we use the
// snapshot source as the canonical signal of which platform a submission lives on).
export function metricSourceToSlug(source: string): PlatformSlug | null {
  switch (source) {
    case "OAUTH_IG":
      return "ig";
    case "OAUTH_TT":
      return "tt";
    case "OAUTH_YT":
      return "yt";
    case "OAUTH_FB":
      return "fb";
    default:
      return null;
  }
}

export interface KpiValue {
  value: number;
  delta: number | null;
}

export interface AgeBuckets {
  [bucket: string]: number;
}

export interface GenderSplit {
  male?: number;
  female?: number;
  other?: number;
}

export interface CountryShare {
  code: string;
  share: number;
}

export interface AggregatedDemographics {
  ageBuckets: AgeBuckets;
  genderSplit: GenderSplit;
  topCountries: CountryShare[];
  sampleCount: number;
}
