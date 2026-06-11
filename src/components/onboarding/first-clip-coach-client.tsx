"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, CheckCircle2, Circle, HelpCircle, RefreshCw, Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { FirstClipOnboardingStatus, FirstClipStep } from "@/lib/first-clip-onboarding";

const STEP_ORDER: Exclude<FirstClipStep, "done">[] = [
  "discord",
  "connect_account",
  "join_campaign",
  "submit_clip",
];

export function shouldShowFirstClipCoach(pathname: string) {
  return (
    pathname === "/creator/dashboard" ||
    pathname.startsWith("/creator/connections") ||
    pathname.startsWith("/creator/campaigns") ||
    pathname === "/creator/videos" ||
    pathname.startsWith("/creator/videos/") ||
    /^\/creator\/applications\/[^/]+\/submit(?:\/)?$/.test(pathname)
  );
}

export function FirstClipCoachClient({
  status,
}: {
  status: FirstClipOnboardingStatus;
}) {
  const t = useTranslations("creator.firstClipOnboarding");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams.get("firstClip") === "1";
  const [dialogOpen, setDialogOpen] = useState(shouldAutoOpen);

  const steps = useMemo(
    () =>
      STEP_ORDER.map((step) => ({
        step,
        complete: isStepComplete(status, step),
        current: status.nextStep === step,
      })),
    [status],
  );

  if (!shouldShowFirstClipCoach(pathname) || status.nextStep === "done") {
    return null;
  }

  const details = t.raw("details") as string[];

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
        <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-normal text-neutral-950">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              {t(`steps.${status.nextStep}.description`)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              <HelpCircle className="h-4 w-4" aria-hidden />
              {t("learnMore")}
            </button>
            <a
              href={status.nextHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] transition hover:bg-neutral-800"
            >
              <Send className="h-4 w-4" aria-hidden />
              {t(`steps.${status.nextStep}.cta`)}
            </a>
          </div>
        </div>

        <ol className="grid border-t border-neutral-200 bg-white md:grid-cols-4">
          {steps.map(({ step, complete, current }) => (
            <li
              key={step}
              className="flex min-w-0 items-start gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              {complete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle
                  className={current ? "mt-0.5 h-4 w-4 shrink-0 text-neutral-950" : "mt-0.5 h-4 w-4 shrink-0 text-neutral-300"}
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <p className={current ? "text-sm font-semibold text-neutral-950" : "text-sm font-medium text-neutral-500"}>
                  {t(`steps.${step}.label`)}
                </p>
                {current ? (
                  <p className="mt-0.5 text-xs leading-5 text-neutral-500">
                    {t("current")}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t("drawer.title")}
        description={t("drawer.description")}
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-neutral-950" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">{t("drawer.beforeTitle")}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-600">
                  {details.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-950" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-neutral-950" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-neutral-950">{t("drawer.notFoundTitle")}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{t("drawer.notFoundBody")}</p>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function isStepComplete(
  status: FirstClipOnboardingStatus,
  step: Exclude<FirstClipStep, "done">,
) {
  if (step === "discord") return status.discordConnected;
  if (step === "connect_account") return status.accountConnected;
  if (step === "join_campaign") return status.hasJoinedCampaign;
  return status.firstClipSubmitted;
}
