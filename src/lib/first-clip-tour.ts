import type {
  FirstClipOnboardingStatus,
  FirstClipStep,
} from "@/lib/first-clip-onboarding";

export type FirstClipTourStepId =
  | "nav_campaigns"
  | "nav_connections"
  | "nav_videos"
  | "nav_payouts"
  | "nav_referral"
  | "discord_cta"
  | "social_connect"
  | "campaign_guide"
  | "campaign_card"
  | "campaign_join"
  | "submit_platform"
  | "submit_account"
  | "submit_refresh"
  | "submit_post"
  | "submit_action";

export type FirstClipTourRoute =
  | "campaigns"
  | "connections"
  | "videos"
  | "payouts"
  | "referral"
  | "campaign_detail"
  | "submit"
  | "creator_shell";

type FirstClipTourPhase = Exclude<FirstClipStep, "done"> | "all";

export interface FirstClipTourStep {
  id: FirstClipTourStepId;
  target: string;
  routes: readonly FirstClipTourRoute[];
  phases: readonly FirstClipTourPhase[];
  opensMobileMenu?: boolean;
}

export interface FirstClipTourStorageState {
  dismissed: boolean;
  completed: boolean;
  activeStepId: FirstClipTourStepId | null;
  skippedStepIds: FirstClipTourStepId[];
  updatedAt: string | null;
}

interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const DEFAULT_STORAGE_STATE: FirstClipTourStorageState = {
  dismissed: false,
  completed: false,
  activeStepId: null,
  skippedStepIds: [],
  updatedAt: null,
};

export const FIRST_CLIP_TOUR_STORAGE_VERSION = 2;
export const FIRST_CLIP_TOUR_OPEN_MOBILE_MENU_EVENT =
  "clipprofit:first-clip-open-mobile-menu";
export const FIRST_CLIP_TOUR_CLOSE_MOBILE_MENU_EVENT =
  "clipprofit:first-clip-close-mobile-menu";

export const FIRST_CLIP_TOUR_STEPS: readonly FirstClipTourStep[] = [
  {
    id: "nav_campaigns",
    target: "creator-nav-campaigns",
    routes: ["campaigns"],
    phases: ["all"],
  },
  {
    id: "nav_connections",
    target: "creator-nav-connections",
    routes: ["connections"],
    phases: ["all"],
  },
  {
    id: "nav_videos",
    target: "creator-nav-videos",
    routes: ["videos"],
    phases: ["all"],
  },
  {
    id: "nav_payouts",
    target: "creator-nav-payouts",
    routes: ["payouts"],
    phases: ["all"],
  },
  {
    id: "nav_referral",
    target: "creator-nav-referral",
    routes: ["referral"],
    phases: ["all"],
    opensMobileMenu: true,
  },
  {
    id: "discord_cta",
    target: "first-clip-discord-action",
    routes: ["creator_shell"],
    phases: ["discord"],
  },
  {
    id: "social_connect",
    target: "social-connect",
    routes: ["connections"],
    phases: ["connect_account"],
  },
  {
    id: "campaign_guide",
    target: "campaign-guide",
    routes: ["campaigns"],
    phases: ["join_campaign"],
  },
  {
    id: "campaign_card",
    target: "campaign-card",
    routes: ["campaigns"],
    phases: ["join_campaign"],
  },
  {
    id: "campaign_join",
    target: "campaign-join",
    routes: ["campaign_detail"],
    phases: ["join_campaign"],
  },
  {
    id: "submit_platform",
    target: "submit-platform-tabs",
    routes: ["submit"],
    phases: ["submit_clip"],
  },
  {
    id: "submit_account",
    target: "submit-account-switcher",
    routes: ["submit"],
    phases: ["submit_clip"],
  },
  {
    id: "submit_refresh",
    target: "submit-refresh",
    routes: ["submit"],
    phases: ["submit_clip"],
  },
  {
    id: "submit_post",
    target: "submit-post-card",
    routes: ["submit"],
    phases: ["submit_clip"],
  },
  {
    id: "submit_action",
    target: "submit-action",
    routes: ["submit"],
    phases: ["submit_clip"],
  },
];

export function getFirstClipTourStepsForStatus(
  nextStep: FirstClipStep,
  pathname?: string,
  skippedStepIds: readonly FirstClipTourStepId[] = [],
): readonly FirstClipTourStep[] {
  if (nextStep === "done") return [];
  const skipped = new Set(skippedStepIds);
  const steps = FIRST_CLIP_TOUR_STEPS.filter(
    (step) =>
      !skipped.has(step.id) &&
      (step.phases.includes("all") || step.phases.includes(nextStep)),
  );

  if (nextStep === "join_campaign" && pathname) {
    if (matchesFirstClipTourRouteName("campaign_detail", pathname)) {
      return steps.filter(
        (step) =>
          step.phases.includes("all") || step.id === "campaign_join",
      );
    }
    if (matchesFirstClipTourRouteName("campaigns", pathname)) {
      return steps.filter((step) => step.id !== "campaign_join");
    }
  }

  return steps;
}

export function getFirstClipTourStepById(
  stepId: string | null | undefined,
  steps: readonly FirstClipTourStep[] = FIRST_CLIP_TOUR_STEPS,
) {
  if (!stepId) return undefined;
  return steps.find((step) => step.id === stepId);
}

export function isFirstClipTourStepId(
  value: string | null | undefined,
): value is FirstClipTourStepId {
  return Boolean(getFirstClipTourStepById(value));
}

export function isFirstClipTourActionStep(stepId: FirstClipTourStepId) {
  return !stepId.startsWith("nav_");
}

export function matchesFirstClipTourRoute(
  step: FirstClipTourStep,
  pathname: string,
) {
  return step.routes.some((route) =>
    matchesFirstClipTourRouteName(route, pathname),
  );
}

export function matchesFirstClipTourRouteName(
  route: FirstClipTourRoute,
  pathname: string,
) {
  if (route === "creator_shell") return pathname.startsWith("/creator");
  if (route === "connections") return pathname.startsWith("/creator/connections");
  if (route === "campaigns") return pathname === "/creator/campaigns";
  if (route === "videos") {
    return pathname === "/creator/videos" || pathname.startsWith("/creator/videos/");
  }
  if (route === "payouts") return pathname.startsWith("/creator/payouts");
  if (route === "referral") return pathname.startsWith("/creator/referral");
  if (route === "campaign_detail") {
    return /^\/creator\/campaigns\/[^/]+(?:\/)?$/.test(pathname);
  }
  return /^\/creator\/applications\/[^/]+\/submit(?:\/)?$/.test(pathname);
}

export function resolveFirstClipTourVisibleStepId({
  steps,
  requestedStepId,
  pathname,
  hasTarget,
}: {
  steps: readonly FirstClipTourStep[];
  requestedStepId: FirstClipTourStepId | null;
  pathname: string;
  hasTarget: (step: FirstClipTourStep) => boolean;
}) {
  const requested = getFirstClipTourStepById(requestedStepId, steps);
  if (
    requested &&
    matchesFirstClipTourRoute(requested, pathname) &&
    hasTarget(requested)
  ) {
    return requested.id;
  }

  const routeMatch = steps.find(
    (step) => matchesFirstClipTourRoute(step, pathname) && hasTarget(step),
  );
  if (routeMatch) return routeMatch.id;

  return steps[0]?.id ?? null;
}

export function getFirstClipTourStepHref(
  step: FirstClipTourStep,
  status: FirstClipOnboardingStatus,
) {
  if (step.id === "nav_campaigns") return "/creator/campaigns?firstClip=1";
  if (step.id === "nav_connections") return "/creator/connections?firstClip=1";
  if (step.id === "nav_videos") return "/creator/videos?firstClip=1";
  if (step.id === "nav_payouts") return "/creator/payouts?firstClip=1";
  if (step.id === "nav_referral") return "/creator/referral?firstClip=1";
  if (step.id === "discord_cta") return status.nextHref;
  if (step.id === "social_connect") return "/creator/connections?firstClip=1";
  if (step.id === "campaign_guide" || step.id === "campaign_card") {
    return "/creator/campaigns?firstClip=1";
  }
  if (step.id === "campaign_join") return "/creator/campaigns?firstClip=1";
  if (step.routes.includes("submit")) return status.nextHref;
  return status.nextHref || "/creator/campaigns?firstClip=1";
}

export function withFirstClipTourQuery(
  href: string,
  stepId?: FirstClipTourStepId | null,
) {
  const base = "https://clipprofit.local";
  const url = new URL(href, base);
  url.searchParams.set("firstClip", "1");
  if (stepId) url.searchParams.set("firstClipTour", stepId);
  return url.origin === base
    ? `${url.pathname}${url.search}${url.hash}`
    : url.toString();
}

export function getFirstClipTourStorageKey(scope = "global") {
  return `clipprofit:first-clip-tour:${scope}:v${FIRST_CLIP_TOUR_STORAGE_VERSION}`;
}

export function parseFirstClipTourStorage(
  value: string | null,
): FirstClipTourStorageState {
  if (!value) return { ...DEFAULT_STORAGE_STATE };
  try {
    const parsed = JSON.parse(value) as Partial<FirstClipTourStorageState>;
    return {
      dismissed: Boolean(parsed.dismissed),
      completed: Boolean(parsed.completed),
      activeStepId: isFirstClipTourStepId(parsed.activeStepId)
        ? parsed.activeStepId
        : null,
      skippedStepIds: normalizeStepIds(parsed.skippedStepIds),
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt
          ? parsed.updatedAt
          : null,
    };
  } catch {
    return { ...DEFAULT_STORAGE_STATE };
  }
}

export function readFirstClipTourStorage(
  storage: StorageLike,
  scope?: string,
) {
  try {
    return parseFirstClipTourStorage(
      storage.getItem(getFirstClipTourStorageKey(scope)),
    );
  } catch {
    return { ...DEFAULT_STORAGE_STATE };
  }
}

export function writeFirstClipTourStorage(
  storage: StorageLike,
  scope: string | undefined,
  state: FirstClipTourStorageState,
) {
  try {
    storage.setItem(getFirstClipTourStorageKey(scope), JSON.stringify(state));
  } catch {
    // Tour progress is helpful but never required for the first-clip flow.
  }
}

export function clearFirstClipTourStorage(
  storage: StorageLike,
  scope?: string,
) {
  try {
    storage.removeItem(getFirstClipTourStorageKey(scope));
  } catch {
    // Ignore unavailable browser storage.
  }
}

function normalizeStepIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<FirstClipTourStepId>();
  for (const item of value) {
    if (isFirstClipTourStepId(item)) seen.add(item);
  }
  return [...seen];
}
