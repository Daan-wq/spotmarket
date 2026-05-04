import { Niche } from "@prisma/client";

export interface NicheConfig {
  label: string;
  cpmBenchmark: number; // EUR
  isLegacy: boolean;
  color: string;
  description: string;
}

export const NICHE_CONFIG: Record<Niche, NicheConfig> = {
  FINANCE: {
    label: "Finance & Investing",
    cpmBenchmark: 12.5,
    isLegacy: false,
    color: "emerald",
    description: "Highest CPM niche — crypto, stocks, personal finance",
  },
  TECH: {
    label: "Tech & AI",
    cpmBenchmark: 10.8,
    isLegacy: false,
    color: "blue",
    description: "Second-highest CPM — SaaS, AI tools, gadgets",
  },
  MOTIVATION: {
    label: "Motivation & Mindset",
    cpmBenchmark: 6.5,
    isLegacy: false,
    color: "purple",
    description: "Low production cost, strong digital product monetization",
  },
  FOOD: {
    label: "Food & Recipe",
    cpmBenchmark: 5.2,
    isLegacy: false,
    color: "orange",
    description: "Highest shopping conversion rate (6.04%)",
  },
  HUMOR: {
    label: "Humor & Memes",
    cpmBenchmark: 4.5,
    isLegacy: false,
    color: "yellow",
    description: "Massive reach potential — proven acquisition model (IMGN $85M)",
  },
  LIFESTYLE: {
    label: "Lifestyle",
    cpmBenchmark: 4.0,
    isLegacy: false,
    color: "pink",
    description: "General lifestyle content — broad appeal",
  },
  CASINO: {
    label: "Casino / Gambling",
    cpmBenchmark: 8.0,
    isLegacy: true,
    color: "red",
    description:
      "⚠️ Legacy niche — illegaal in NL (KSA-verbod sinds juli 2023). Wordt geleidelijk uitgefaseerd.",
  },
  MEMES: {
    label: "Memes",
    cpmBenchmark: 4.5,
    isLegacy: false,
    color: "yellow",
    description: "Viral meme content — massive reach potential",
  },
  SPORT: {
    label: "Sport",
    cpmBenchmark: 6.0,
    isLegacy: false,
    color: "green",
    description: "Sports highlights, analysis, and fan content",
  },
  CLIPS: {
    label: "Clips",
    cpmBenchmark: 5.0,
    isLegacy: false,
    color: "cyan",
    description: "Short-form video clips and compilations",
  },
  GAMING: {
    label: "Gaming",
    cpmBenchmark: 7.0,
    isLegacy: false,
    color: "indigo",
    description: "Gaming content, reviews, and gameplay",
  },
  OTHER: {
    label: "Other",
    cpmBenchmark: 4.0,
    isLegacy: false,
    color: "gray",
    description: "Custom niche specified by advertiser",
  },
};

export const ACTIVE_NICHES = (Object.keys(NICHE_CONFIG) as Niche[]).filter(
  (n) => !NICHE_CONFIG[n].isLegacy
);

export const ALL_NICHES = Object.keys(NICHE_CONFIG) as Niche[];
