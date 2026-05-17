"use client";

import PlatformIcon from "@/components/shared/PlatformIcon";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getCampaignDeadlineState } from "@/lib/campaign-submission-state";
import { formatCurrency } from "@/lib/i18n-format";
import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type CampaignStatus =
  | "draft"
  | "pending_payment"
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "cancelled"
  | string;

export function CampaignAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const initial = (name.trim().charAt(0) || "C").toUpperCase();
  const sizeClass = {
    sm: "h-10 w-10 rounded-xl text-sm",
    md: "h-12 w-12 rounded-xl text-base",
    lg: "h-16 w-16 rounded-2xl text-xl",
    xl: "h-24 w-24 rounded-2xl text-3xl",
  }[size];

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn("shrink-0 object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-neutral-950 font-bold text-white",
        sizeClass,
        className,
      )}
    >
      {initial}
    </div>
  );
}

export function campaignStatusDisplay(status: CampaignStatus, deadline?: Date | string | null) {
  const normalized = status.toLowerCase();
  const isExpired = deadline ? getCampaignDeadlineState(deadline).state === "ended" : false;

  if (normalized === "active" && !isExpired) {
    return { labelKey: "active", variant: "active" as BadgeVariant };
  }
  if (normalized === "paused") {
    return { labelKey: "paused", variant: "paused" as BadgeVariant };
  }
  if (
    normalized === "draft" ||
    normalized === "pending_payment" ||
    normalized === "pending_review"
  ) {
    return { labelKey: "private", variant: "private" as BadgeVariant };
  }
  return { labelKey: "ended", variant: "neutral" as BadgeVariant };
}

export function CampaignStatusBadge({
  status,
  deadline,
  className,
}: {
  status: CampaignStatus;
  deadline?: Date | string | null;
  className?: string;
}) {
  const t = useTranslations("creator.shared.statuses.campaign");
  const display = campaignStatusDisplay(status, deadline);
  return (
    <Badge variant={display.variant} className={className}>
      {t(display.labelKey)}
    </Badge>
  );
}

export function getDeadlineState(deadline: Date | string | null | undefined) {
  return getCampaignDeadlineState(deadline);
}

export function CampaignDeadlineBadge({
  deadline,
  className,
}: {
  deadline?: Date | string | null;
  className?: string;
}) {
  const t = useTranslations("creator.campaigns.deadline");
  const state = getDeadlineState(deadline);
  const variant: BadgeVariant =
    state.state === "ended"
      ? "neutral"
      : state.state === "today" || state.state === "soon"
        ? "ending-soon"
        : "neutral";

  return (
    <Badge
      variant={variant}
      icon={<Clock className="h-3 w-3" aria-hidden />}
      className={className}
    >
      {deadlineLabel(state, t)}
    </Badge>
  );
}

export function CampaignPlatformRow({
  platforms,
  size = 24,
  limit = 4,
  className,
}: {
  platforms: string[];
  size?: number;
  limit?: number;
  className?: string;
}) {
  const visible = platforms.slice(0, limit);
  const extra = Math.max(platforms.length - visible.length, 0);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {visible.map((platform) => (
        <PlatformIcon key={platform} platform={platform} size={size} />
      ))}
      {extra > 0 ? (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-500">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function CampaignBudgetProgress({
  totalPaid,
  totalBudget,
  compact = false,
}: {
  totalPaid: number;
  totalBudget: number;
  compact?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("creator.campaigns.deadline");
  const progress =
    totalBudget > 0 ? Math.min((totalPaid / totalBudget) * 100, 100) : 0;
  const moneyOptions = compact
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : undefined;

  return (
    <div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-950 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>
          {t("paidProgress", {
            paid: formatCurrency(totalPaid, locale, moneyOptions),
            budget: formatCurrency(totalBudget, locale, moneyOptions),
          })}
        </span>
        <span>{progress.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function deadlineLabel(
  state: ReturnType<typeof getCampaignDeadlineState>,
  t: ReturnType<typeof useTranslations>,
): string {
  if (state.state === "none") return t("noDeadline");
  if (state.state === "ended") return t("ended");
  if (state.state === "today") return t("today");
  if (state.days === 1) return t("oneDay");
  return t("days", { days: state.days ?? 0 });
}
