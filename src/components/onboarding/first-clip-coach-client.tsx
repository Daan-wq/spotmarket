"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FirstClipSpotlight } from "@/components/onboarding/first-clip-spotlight";
import {
  getFirstClipTourStepById,
  getFirstClipTourStepsForStatus,
  isFirstClipTourStepId,
  parseFirstClipTourStorage,
  readFirstClipTourStorage,
  writeFirstClipTourStorage,
  type FirstClipTourStepId,
  type FirstClipTourStorageState,
} from "@/lib/first-clip-tour";
import type { FirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";

const TOUR_STORAGE_EVENT = "clipprofit:first-clip-tour-storage";
const DEFAULT_TOUR_STORAGE_SNAPSHOT = JSON.stringify(parseFirstClipTourStorage(null));

export function shouldShowFirstClipCoach(pathname: string) {
  return pathname.startsWith("/creator");
}

export function shouldRenderFirstClipCoach(
  pathname: string,
  status: Pick<FirstClipOnboardingStatus, "nextStep">,
) {
  return shouldShowFirstClipCoach(pathname) && status.nextStep !== "done";
}

export function shouldStartFirstClipTour(
  firstClipQuery: string | null,
  requestedTourStep: string | null,
) {
  return firstClipQuery === "1" || isFirstClipTourStepId(requestedTourStep);
}

export function FirstClipCoachClient({
  status,
  storageScope,
}: {
  status: FirstClipOnboardingStatus;
  storageScope?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTourStep = searchParams.get("firstClipTour");
  const queryWantsTour = shouldStartFirstClipTour(
    searchParams.get("firstClip"),
    requestedTourStep,
  );
  const [tourOpen, setTourOpen] = useState(false);
  const [queryStartSuppressed, setQueryStartSuppressed] = useState(false);

  const tourStorageSnapshot = useSyncExternalStore(
    subscribeTourStorage,
    () => readTourStorageSnapshot(storageScope),
    () => DEFAULT_TOUR_STORAGE_SNAPSHOT,
  );
  const tourState = useMemo(
    () => parseFirstClipTourStorage(tourStorageSnapshot),
    [tourStorageSnapshot],
  );
  const tourSteps = useMemo(
    () =>
      getFirstClipTourStepsForStatus(
        status.nextStep,
        pathname,
        tourState.skippedStepIds,
      ),
    [pathname, status.nextStep, tourState.skippedStepIds],
  );

  if (!shouldRenderFirstClipCoach(pathname, status)) {
    return null;
  }

  const requestedTourStepId =
    isFirstClipTourStepId(requestedTourStep) &&
    getFirstClipTourStepById(requestedTourStep, tourSteps)
      ? requestedTourStep
      : null;
  const storedTourStepId =
    tourState.activeStepId &&
    getFirstClipTourStepById(tourState.activeStepId, tourSteps)
      ? tourState.activeStepId
      : null;
  const activeTourStepId = requestedTourStepId ?? storedTourStepId ?? tourSteps[0]?.id ?? null;
  const spotlightOpen = Boolean(
    tourSteps.length &&
      (tourOpen || (queryWantsTour && !queryStartSuppressed)),
  );

  function persistTour(partial: Partial<FirstClipTourStorageState>) {
    const currentState = readCurrentTourState(storageScope);
    persistTourState(storageScope, {
      ...currentState,
      activeStepId: activeTourStepId,
      updatedAt: new Date().toISOString(),
      ...partial,
    });
  }

  function handleTourStepChange(stepId: FirstClipTourStepId | null) {
    persistTour({
      dismissed: false,
      completed: false,
      activeStepId: stepId,
    });
    setTourOpen(Boolean(stepId));
  }

  function closeTour() {
    setTourOpen(false);
    setQueryStartSuppressed(true);
    persistTour({
      dismissed: true,
      activeStepId: activeTourStepId,
    });
  }

  function skipTourStep(
    stepId: FirstClipTourStepId,
    nextStepId: FirstClipTourStepId | null,
  ) {
    const currentState = readCurrentTourState(storageScope);
    const skippedStepIds = [...new Set([...currentState.skippedStepIds, stepId])];
    persistTourState(storageScope, {
      ...currentState,
      dismissed: false,
      completed: !nextStepId,
      activeStepId: nextStepId,
      skippedStepIds,
      updatedAt: new Date().toISOString(),
    });
    setTourOpen(Boolean(nextStepId));
    if (!nextStepId) setQueryStartSuppressed(true);
  }

  function completeTour() {
    setTourOpen(false);
    setQueryStartSuppressed(true);
    persistTour({
      dismissed: false,
      completed: true,
      activeStepId: null,
    });
  }

  return (
    <FirstClipSpotlight
      status={status}
      steps={tourSteps}
      open={spotlightOpen}
      activeStepId={activeTourStepId}
      onStepChange={handleTourStepChange}
      onClose={closeTour}
      onSkipStep={skipTourStep}
      onComplete={completeTour}
    />
  );
}

function readCurrentTourState(storageScope: string | undefined) {
  if (typeof window === "undefined") return parseFirstClipTourStorage(null);
  return readFirstClipTourStorage(window.localStorage, storageScope);
}

function persistTourState(
  storageScope: string | undefined,
  state: FirstClipTourStorageState,
) {
  writeFirstClipTourStorage(window.localStorage, storageScope, state);
  window.dispatchEvent(new Event(TOUR_STORAGE_EVENT));
}

function subscribeTourStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(TOUR_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(TOUR_STORAGE_EVENT, onChange);
  };
}

function readTourStorageSnapshot(storageScope: string | undefined) {
  if (typeof window === "undefined") return DEFAULT_TOUR_STORAGE_SNAPSHOT;
  return JSON.stringify(readFirstClipTourStorage(window.localStorage, storageScope));
}
