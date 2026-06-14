"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  FIRST_CLIP_TOUR_CLOSE_MOBILE_MENU_EVENT,
  FIRST_CLIP_TOUR_OPEN_MOBILE_MENU_EVENT,
  getFirstClipTourStepById,
  getFirstClipTourStepHref,
  isFirstClipTourActionStep,
  matchesFirstClipTourRoute,
  resolveFirstClipTourVisibleStepId,
  withFirstClipTourQuery,
  type FirstClipTourStep,
  type FirstClipTourStepId,
} from "@/lib/first-clip-tour";
import type { FirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";

interface FirstClipSpotlightProps {
  status: FirstClipOnboardingStatus;
  steps: readonly FirstClipTourStep[];
  open: boolean;
  activeStepId: FirstClipTourStepId | null;
  onStepChange: (stepId: FirstClipTourStepId | null) => void;
  onClose: () => void;
  onSkipStep: (
    stepId: FirstClipTourStepId,
    nextStepId: FirstClipTourStepId | null,
  ) => void;
  onComplete: () => void;
}

export type TargetRect = Pick<
  DOMRect,
  "top" | "left" | "width" | "height" | "right" | "bottom"
>;

type SpotlightBounds = TargetRect;

export function FirstClipSpotlight({
  status,
  steps,
  open,
  activeStepId,
  onStepChange,
  onClose,
  onSkipStep,
  onComplete,
}: FirstClipSpotlightProps) {
  const t = useTranslations("creator.firstClipOnboarding.tour");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep =
    getFirstClipTourStepById(activeStepId, steps) ?? steps[0] ?? null;
  const currentIndex = currentStep
    ? steps.findIndex((step) => step.id === currentStep.id)
    : -1;
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [actionSurfaceActive, setActionSurfaceActive] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (findActiveAppDialogSurface()) return;
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    const isAllowed = (node: EventTarget | null) =>
      isTourInteractionAllowed(
        node,
        targetElementRef.current,
        dialogRef.current,
      );

    const blockInteraction = (event: Event) => {
      if (isAllowed(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    const blockScroll = (event: Event) => {
      if (isAllowed(event.target)) return;
      event.preventDefault();
    };

    const trapKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        trapTourFocus(event, targetElementRef.current, dialogRef.current);
        return;
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        !isAllowed(document.activeElement)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const keepFocusInsideTour = (event: FocusEvent) => {
      if (isAllowed(event.target)) return;
      focusTourPrimaryControl(dialogRef.current);
    };

    const blockBrowserBack = () => {
      window.history.forward();
    };

    document.addEventListener("pointerdown", blockInteraction, true);
    document.addEventListener("click", blockInteraction, true);
    document.addEventListener("auxclick", blockInteraction, true);
    document.addEventListener("contextmenu", blockInteraction, true);
    document.addEventListener("wheel", blockScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchmove", blockScroll, {
      capture: true,
      passive: false,
    });
    document.addEventListener("keydown", trapKeyboard, true);
    document.addEventListener("focusin", keepFocusInsideTour, true);
    window.addEventListener("popstate", blockBrowserBack);

    const focusTimer = window.setTimeout(
      () => focusTourPrimaryControl(dialogRef.current),
      0,
    );

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.removeEventListener("pointerdown", blockInteraction, true);
      document.removeEventListener("click", blockInteraction, true);
      document.removeEventListener("auxclick", blockInteraction, true);
      document.removeEventListener("contextmenu", blockInteraction, true);
      document.removeEventListener("wheel", blockScroll, true);
      document.removeEventListener("touchmove", blockScroll, true);
      document.removeEventListener("keydown", trapKeyboard, true);
      document.removeEventListener("focusin", keepFocusInsideTour, true);
      window.removeEventListener("popstate", blockBrowserBack);
      window.dispatchEvent(
        new Event(FIRST_CLIP_TOUR_CLOSE_MOBILE_MENU_EVENT),
      );
    };
  }, [open]);

  useEffect(() => {
    if (!open || !currentStep) return;

    let frame = 0;
    let mobileMenuTimer = 0;
    let revealTimer = 0;
    const update = () => {
      const mobileChrome = window.innerWidth < 1024;
      const mobileSheet = window.innerWidth < 768;
      setIsMobile(mobileSheet);

      if (mobileChrome && currentStep.opensMobileMenu) {
        window.dispatchEvent(new Event(FIRST_CLIP_TOUR_OPEN_MOBILE_MENU_EVENT));
      } else {
        window.dispatchEvent(
          new Event(FIRST_CLIP_TOUR_CLOSE_MOBILE_MENU_EVENT),
        );
      }

      const actionSurface = findActiveAppDialogSurface();
      const target =
        actionSurface ??
        findFirstClipTarget(
          currentStep.target,
          mobileChrome && !currentStep.opensMobileMenu,
        );
      targetElementRef.current = target;
      setActionSurfaceActive(Boolean(actionSurface));

      if (!target) {
        setHasTarget(false);
        setTargetRect(null);

        if (
          matchesFirstClipTourRoute(currentStep, pathname) &&
          !isFirstClipTourActionStep(currentStep.id)
        ) {
          const fallback = resolveFirstClipTourVisibleStepId({
            steps,
            requestedStepId: currentStep.id,
            pathname,
            hasTarget: (step) =>
              Boolean(
                findFirstClipTarget(
                  step.target,
                  mobileChrome && !step.opensMobileMenu,
                ),
              ),
          });
          if (fallback && fallback !== currentStep.id) {
            onStepChange(fallback);
          }
        }
        return;
      }

      setHasTarget(true);
      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    };

    const scrollIntoView = () => {
      const mobileChrome = window.innerWidth < 1024;
      if (mobileChrome && currentStep.opensMobileMenu) {
        window.dispatchEvent(new Event(FIRST_CLIP_TOUR_OPEN_MOBILE_MENU_EVENT));
      } else {
        window.dispatchEvent(
          new Event(FIRST_CLIP_TOUR_CLOSE_MOBILE_MENU_EVENT),
        );
      }

      mobileMenuTimer = window.setTimeout(
        () => {
          const target = findFirstClipTarget(
            currentStep.target,
            mobileChrome && !currentStep.opensMobileMenu,
          );
          targetElementRef.current = target;
          target?.scrollIntoView({ block: "center", behavior: "smooth" });
          update();
          revealTimer = window.setTimeout(() => {
            if (target && window.innerWidth < 768) {
              keepTargetAboveDialog(target, dialogRef.current);
            }
            update();
          }, 240);
        },
        mobileChrome ? 220 : 0,
      );
    };

    scrollIntoView();
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    frame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(mobileMenuTimer);
      window.clearTimeout(revealTimer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [currentStep, onStepChange, open, pathname, steps]);

  useEffect(() => {
    if (!open) return;
    if (!currentStep && steps[0]) onStepChange(steps[0].id);
  }, [currentStep, onStepChange, open, steps]);

  const nextStep = useMemo(() => {
    if (!currentStep || currentIndex < 0) return null;
    return steps[currentIndex + 1] ?? null;
  }, [currentIndex, currentStep, steps]);

  if (!open || !currentStep || currentIndex < 0) return null;

  const routeMatches = matchesFirstClipTourRoute(currentStep, pathname);
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const panelStyle = getPanelStyle(targetRect, isMobile);
  const spotlightBounds =
    targetRect && hasTarget
      ? getSpotlightBounds(
          targetRect,
          window.innerWidth,
          window.innerHeight,
        )
      : null;
  const isDirectAction =
    currentStep.id === "discord_cta" || (!routeMatches && isFirstClipTourActionStep(currentStep.id));
  const isLast = !nextStep;

  function openStepHref(step: FirstClipTourStep) {
    const href = withFirstClipTourQuery(
      getFirstClipTourStepHref(step, status),
      step.id,
    );
    if (href.startsWith("/api/") || href.startsWith("http")) {
      window.location.assign(href);
      return;
    }
    router.push(href);
  }

  function goToStep(step: FirstClipTourStep) {
    onStepChange(step.id);
    if (!matchesFirstClipTourRoute(step, pathname)) {
      openStepHref(step);
      return;
    }
    router.replace(withFirstClipTourQuery(getCurrentHref(pathname, searchParams), step.id), {
      scroll: false,
    });
  }

  function handlePrimary() {
    if (!routeMatches || isDirectAction) {
      openStepHref(currentStep);
      return;
    }
    if (!nextStep) {
      onComplete();
      return;
    }
    goToStep(nextStep);
  }

  function handleSkip() {
    const nextUnskippedStep = steps[currentIndex + 1] ?? null;
    onSkipStep(currentStep.id, nextUnskippedStep?.id ?? null);
    if (nextUnskippedStep) {
      goToStep(nextUnskippedStep);
    }
  }

  const primaryLabel =
    !routeMatches || isDirectAction
      ? t(`steps.${currentStep.id}.cta`)
      : isLast
        ? t("finish")
        : t("next");

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-live="polite"
      data-first-clip-tour-root
    >
      {spotlightBounds ? (
        <>
          <SpotlightInteractionBlockers bounds={spotlightBounds} />
          <div
            className="pointer-events-none fixed rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(9,9,11,0.56),0_18px_60px_rgba(9,9,11,0.24)] ring-2 ring-neutral-950/80"
            style={spotlightBounds}
            aria-hidden
          />
        </>
      ) : (
        <div
          className="pointer-events-auto fixed inset-0 bg-neutral-950/60"
          aria-hidden
        />
      )}

      {!actionSurfaceActive ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogLabel")}
          data-first-clip-tour-dialog
          className="pointer-events-auto fixed flex w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-neutral-950 shadow-2xl"
          style={panelStyle}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 px-4 pb-2 pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {t("counter", { current: currentIndex + 1, total: steps.length })}
              </p>
              <h3 className="mt-1 text-base font-semibold tracking-normal text-neutral-950">
                {t(`steps.${currentStep.id}.title`)}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
            <p className="text-sm leading-6 text-neutral-600">
              {t(`steps.${currentStep.id}.body`)}
            </p>
            {!hasTarget || !routeMatches ? (
              <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500 ring-1 ring-neutral-200">
                {!routeMatches ? t("openPageHint") : t("fallback")}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 bg-white px-3 py-3">
            <button
              type="button"
              onClick={handleSkip}
              className="inline-flex h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              {t("skip")}
            </button>
            <div className="flex min-w-0 items-center justify-end gap-2">
              <button
                type="button"
                disabled={!previousStep}
                onClick={() => previousStep && goToStep(previousStep)}
                className="inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                {t("back")}
              </button>
              <button
                type="button"
                onClick={handlePrimary}
                data-first-clip-tour-primary
                className="inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:bg-neutral-800"
              >
                {primaryLabel}
                {!isLast || !routeMatches || isDirectAction ? (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                ) : null}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function findFirstClipTarget(target: string, preferLast = false) {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-first-clip-target="${target}"]`),
  ).filter(isVisibleElement);
  return (preferLast ? elements.at(-1) : elements[0]) ?? null;
}

function findActiveAppDialogSurface() {
  const surfaces = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-first-clip-tour-action-surface]",
    ),
  ).filter(isVisibleElement);
  return surfaces.at(-1) ?? null;
}

function getCurrentHref(pathname: string, searchParams: { toString: () => string }) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isVisibleElement(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    styles.opacity !== "0"
  );
}

export function getSpotlightBounds(
  rect: TargetRect,
  viewportWidth: number,
  viewportHeight: number,
  padding = 8,
): SpotlightBounds {
  const left = clamp(rect.left - padding, 0, viewportWidth);
  const top = clamp(rect.top - padding, 0, viewportHeight);
  const right = clamp(rect.right + padding, left, viewportWidth);
  const bottom = clamp(rect.bottom + padding, top, viewportHeight);

  return {
    top,
    left,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function SpotlightInteractionBlockers({
  bounds,
}: {
  bounds: SpotlightBounds;
}) {
  const blockerClass = "pointer-events-auto fixed touch-none";

  return (
    <>
      <div
        className={blockerClass}
        style={{ inset: `0 0 auto 0`, height: bounds.top }}
        aria-hidden
      />
      <div
        className={blockerClass}
        style={{
          top: bounds.top,
          left: 0,
          width: bounds.left,
          height: bounds.height,
        }}
        aria-hidden
      />
      <div
        className={blockerClass}
        style={{
          top: bounds.top,
          right: 0,
          width: `calc(100vw - ${bounds.right}px)`,
          height: bounds.height,
        }}
        aria-hidden
      />
      <div
        className={blockerClass}
        style={{ inset: `${bounds.bottom}px 0 0 0` }}
        aria-hidden
      />
    </>
  );
}

function getPanelStyle(
  rect: TargetRect | null,
  isMobile: boolean,
): CSSProperties {
  if (isMobile) {
    const viewportHeight = window.innerHeight;
    const bottom = getMobilePanelBottom(rect, viewportHeight);
    return {
      left: "0.75rem",
      right: "0.75rem",
      bottom: `calc(${bottom}px + env(safe-area-inset-bottom))`,
      width: "auto",
      maxHeight: `min(45dvh, calc(100dvh - ${bottom + 12}px - env(safe-area-inset-bottom)))`,
    };
  }
  if (!rect) {
    return {
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const panelWidth = 368;
  const panelHeightEstimate = 260;
  const gap = 14;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const left = clamp(rect.left, 16, viewportWidth - panelWidth - 16);
  const below = rect.bottom + gap;
  const top =
    below + panelHeightEstimate < viewportHeight
      ? below
      : Math.max(16, rect.top - panelHeightEstimate - gap);

  return { left, top };
}

export function getMobilePanelBottom(
  rect: TargetRect | null,
  viewportHeight: number,
) {
  const defaultBottom = 12;
  if (!rect || rect.top < viewportHeight - 120) return defaultBottom;
  return Math.max(defaultBottom, viewportHeight - rect.top + 12);
}

function isTourInteractionAllowed(
  eventTarget: EventTarget | null,
  target: HTMLElement | null,
  dialog: HTMLElement | null,
) {
  if (!(eventTarget instanceof Node)) return false;
  return Boolean(target?.contains(eventTarget) || dialog?.contains(eventTarget));
}

function getTourFocusableElements(
  target: HTMLElement | null,
  dialog: HTMLElement | null,
) {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const elements = [target, dialog]
    .filter((element): element is HTMLElement => Boolean(element))
    .flatMap((element) => [
      ...(element.matches(selector) ? [element] : []),
      ...Array.from(element.querySelectorAll<HTMLElement>(selector)),
    ])
    .filter(isVisibleElement);

  return Array.from(new Set(elements));
}

function trapTourFocus(
  event: KeyboardEvent,
  target: HTMLElement | null,
  dialog: HTMLElement | null,
) {
  const focusableElements = getTourFocusableElements(target, dialog);
  if (focusableElements.length === 0) {
    event.preventDefault();
    return;
  }

  const activeIndex = focusableElements.indexOf(
    document.activeElement as HTMLElement,
  );
  const nextIndex = event.shiftKey
    ? activeIndex <= 0
      ? focusableElements.length - 1
      : activeIndex - 1
    : activeIndex < 0 || activeIndex === focusableElements.length - 1
      ? 0
      : activeIndex + 1;

  event.preventDefault();
  focusableElements[nextIndex]?.focus();
}

function focusTourPrimaryControl(dialog: HTMLElement | null) {
  const primary = dialog?.querySelector<HTMLElement>(
    "[data-first-clip-tour-primary]",
  );
  primary?.focus();
}

function keepTargetAboveDialog(
  target: HTMLElement,
  dialog: HTMLElement | null,
) {
  if (!dialog || hasFixedAncestor(target)) return;

  const targetRect = target.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const gap = 12;
  let scrollDelta = 0;

  if (targetRect.bottom > dialogRect.top - gap) {
    scrollDelta = targetRect.bottom - dialogRect.top + gap;
  } else if (targetRect.top < gap) {
    scrollDelta = targetRect.top - gap;
  }

  if (scrollDelta === 0) return;
  const scrollParent = findScrollableAncestor(target);
  if (scrollParent) {
    scrollParent.scrollBy({ top: scrollDelta, behavior: "smooth" });
  } else {
    window.scrollBy({ top: scrollDelta, behavior: "smooth" });
  }
}

function findScrollableAncestor(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const styles = window.getComputedStyle(parent);
    const canScroll =
      /(auto|scroll)/.test(styles.overflowY) &&
      parent.scrollHeight > parent.clientHeight;
    if (canScroll) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function hasFixedAncestor(element: HTMLElement) {
  let current: HTMLElement | null = element;
  while (current) {
    if (window.getComputedStyle(current).position === "fixed") return true;
    current = current.parentElement;
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
