import type { CoursePlatform } from "@prisma/client";

export const COURSE_ADMIN_EMAILS = (
  process.env.COURSE_ADMIN_EMAILS ?? "daan0529@icloud.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function canSeeUnpublishedCourses(email?: string | null): boolean {
  return !!email && COURSE_ADMIN_EMAILS.includes(email.toLowerCase());
}

export const PLATFORM_SLUGS = [
  "foundations",
  "tiktok",
  "instagram",
  "youtube",
  "x",
] as const;

export type PlatformSlug = (typeof PLATFORM_SLUGS)[number];

const PLATFORM_BY_SLUG: Record<PlatformSlug, CoursePlatform> = {
  foundations: "FOUNDATIONS",
  tiktok: "TIKTOK",
  instagram: "INSTAGRAM",
  youtube: "YOUTUBE",
  x: "X",
};

const SLUG_BY_PLATFORM: Record<CoursePlatform, PlatformSlug> = {
  FOUNDATIONS: "foundations",
  TIKTOK: "tiktok",
  INSTAGRAM: "instagram",
  YOUTUBE: "youtube",
  X: "x",
};

export function platformFromSlug(slug: string): CoursePlatform | null {
  if (!isPlatformSlug(slug)) return null;
  return PLATFORM_BY_SLUG[slug];
}

export function platformToSlug(platform: CoursePlatform): PlatformSlug {
  return SLUG_BY_PLATFORM[platform];
}

export function isPlatformSlug(value: string): value is PlatformSlug {
  return (PLATFORM_SLUGS as readonly string[]).includes(value);
}

export interface PlatformMeta {
  slug: PlatformSlug;
  label: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  surface: string;
}

export const PLATFORM_META: Record<PlatformSlug, PlatformMeta> = {
  foundations: {
    slug: "foundations",
    label: "Foundations",
    accent: "#6366F1",
    accentSoft: "#eef2ff",
    accentText: "#ffffff",
    surface: "#fafafa",
  },
  tiktok: {
    slug: "tiktok",
    label: "TikTok",
    accent: "#000000",
    accentSoft: "#f4f4f5",
    accentText: "#ffffff",
    surface: "#0a0a0a",
  },
  instagram: {
    slug: "instagram",
    label: "Instagram",
    accent: "#E1306C",
    accentSoft: "#fdf2f8",
    accentText: "#ffffff",
    surface: "#fdf2f8",
  },
  youtube: {
    slug: "youtube",
    label: "YouTube",
    accent: "#FF0000",
    accentSoft: "#fef2f2",
    accentText: "#ffffff",
    surface: "#fef2f2",
  },
  x: {
    slug: "x",
    label: "X",
    accent: "#0f172a",
    accentSoft: "#f8fafc",
    accentText: "#ffffff",
    surface: "#f8fafc",
  },
};
