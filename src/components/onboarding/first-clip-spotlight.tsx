"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  getFirstClipTourStepById,
  getFirstClipTourStepHref,
  getFirstClipTourStepsForStatus,
  matchesFirstClipTourRoute,
  resolveFirstClipTourVisibleStepId,
  withFirstClipTourQuery,
  type FirstClipTourStep,
  type FirstClipTourStepId,
} from "@/lib/first-clip-tour";
import type { FirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";

interface FirstClipSpotlightProps {
  status: FirstClipOnboardingStatus;
  open: boolean;
  activeStepId: FirstClipTourStepId | null;
  onStepChange: (stepId: FirstClipTourStepId | null) => void;
  onClose: () => void;
  onDismiss: () => void;
  onComplete: () => void;
}

type TargetRect = Pick<DOMRect, "top" | "left" | "width" | "height" | "right" | "bottom">;

export function FirstClipSpotlight({
  status,
  open,
  activeStepId,
  onStepChange,
  onClose,
  onDismiss,
  onComplete,
}: FirstClipSpotlightProps) {
  const t = useTranslations("creator.firstClipOnboarding.tour");
  const pathname = usePathname();
  const router = useRouter();
  const steps = useMemo(
    () => getFirstClipTourStepsForStatus(status.nextStep, pathname),
    [pathname, status.nextStep],
  );
  const currentStep =
    getFirstClipTourStepById(activeStepId, steps) ?? steps[0] ?? null;
  const currentIndex = currentStep
    ? steps.findIndex((step) => step.id === currentStep.id)
    : -1;
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [hasTarget, setHasTarget] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !currentStep) return;

    let frame = 0;
    const update = () => {
      setIsMobile(window.innerWidth < 768);
      const target = document.querySelector<HTMLElement>(
        `[data-first-clip-target="${currentStep.target}"]`,
      );

      if (!target) {
        setHasTarget(false);
        setTargetRect(null);

        if (matchesFirstClipTourRoute(currentStep, pathname)) {
          const fallback = resolveFirstClipTourVisibleStepId({
            steps,
            requestedStepId: currentStep.id,
            pathname,
            hasTarget: (step) =>
              Boolean(
                document.querySelector(
                  `[data-first-clip-target="${step.target}"]`,
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
      const target = document.querySelector<HTMLElement>(
        `[data-first-clip-target="${currentStep.target}"]`,
      );
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      window.setTimeout(update, 180);
    };

    scrollIntoView();
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    frame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [currentStep, onStepChange, open, pathname, steps]);

  useEffect(() => {
    if (!open) return;
    if (!currentStep && steps[0]) onStepChange(steps[0].id);
  }, [currentStep, onStepChange, open, steps]);

  if (!open || !currentStep || currentIndex < 0) return null;

  const routeMatches = matchesFirstClipTourRoute(currentStep, pathname);
  const isLast = currentIndex === steps.length - 1;
  const nextStep = isLast ? null : steps[currentIndex + 1];
  const previousStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const panelStyle = getPanelStyle(targetRect, isMobile);

  function goToStep(step: FirstClipTourStep) {
    onStepChange(step.id);
    if (!matchesFirstClipTourRoute(step, pathname)) {
      const href = withFirstClipTourQuery(
        getFirstClipTourStepHref(step, status),
        step.id,
      );
      router.push(href);
    }
  }

  function handlePrimary() {
    if (!routeMatches) {
      goToStep(currentStep);
      return;
    }
    if (!nextStep) {
      onComplete();
      return;
    }
    goToStep(nextStep);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-live="polite">
      {targetRect && hasTarget ? (
        <div
          className="fixed rounded-2xl border border-white/90 shadow-[0_0_0_9999px_rgba(9,9,11,0.42),0_18px_60px_rgba(9,9,11,0.18)] ring-2 ring-neutral-950/80"
          style={getSpotlightStyle(targetRect)}
          aria-hidden
        />
      ) : (
        <div className="fixed inset-0 bg-neutral-950/35" aria-hidden />
      )}

      <div
        role="dialog"
        aria-label={t("dialogLabel")}
        className="pointer-events-auto fixed w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-neutral-200 bg-white p-4 text-neutral-950 shadow-2xl"
        style={panelStyle}
      >
        <div className="flex items-start justify-between gap-4">
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-neutral-600">
          {t(`steps.${currentStep.id}.body`)}
        </p>
        {!hasTarget || !routeMatches ? (
          <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs leading-5 text-neutral-500 ring-1 ring-neutral-200">
            {!routeMatches ? t("openPageHint") : t("fallback")}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-9 items-center justify-center rounded-xl px-2 text-sm font-semibold text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-950"
          >
            {t("skip")}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!previousStep}
              onClick={() => previousStep && goToStep(previousStep)}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              {t("back")}
            </button>
            <button
              type="button"
              onClick={handlePrimary}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:bg-neutral-800"
            >
              {!routeMatches
                ? t(`steps.${currentStep.id}.cta`)
                : isLast
                  ? t("finish")
                  : t("next")}
              {!isLast || !routeMatches ? (
                <ChevronRight className="h-4 w-4" aria-hidden />
              ) : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSpotlightStyle(rect: TargetRect): CSSProperties {
  const padding = 8;
  return {
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getPanelStyle(
  rect: TargetRect | null,
  isMobile: boolean,
): CSSProperties {
  if (isMobile) {
    return {
      left: "1rem",
      right: "1rem",
      bottom: "1rem",
      width: "auto",
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
